provider "aws" {
  region = "us-east-1"
}

# -------------------------------------------------------------------------
# 1. SSH Key Generation (Automated)
# -------------------------------------------------------------------------
# Generate a secure private key in memory
resource "tls_private_key" "mykk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Save the private key to your local computer as "mykk.pem"
# Sets permissions to 0400 (read-only by owner) automatically
resource "local_file" "mykk_pem" {
  content         = tls_private_key.mykk.private_key_pem
  filename        = "${path.module}/mykk.pem"
  file_permission = "0400"
}

# Upload the Public Key part to AWS
resource "aws_key_pair" "mykk" {
  key_name   = "mykk"
  public_key = tls_private_key.mykk.public_key_openssh
}

# -------------------------------------------------------------------------
# 2. VPC and Networking Setup
# -------------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "main-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

# --- Subnets ---
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags                    = { Name = "public-subnet-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
  tags                    = { Name = "public-subnet-b" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1a"
  tags              = { Name = "private-subnet-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "us-east-1b"
  tags              = { Name = "private-subnet-b" }
}

# --- Routing (Public) ---
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "public-rt" }
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# --- NAT Gateway (for Private Subnets) ---
resource "aws_eip" "nat" {
  tags = { Name = "nat-eip" }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  depends_on    = [aws_internet_gateway.igw]
  tags          = { Name = "main-nat" }
}

# --- Routing (Private) ---
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "private-rt" }
}

resource "aws_route" "private_nat_route" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat.id
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# -------------------------------------------------------------------------
# 3. Security Groups
# -------------------------------------------------------------------------

# A. Bastion SG (Allow SSH from anywhere)
resource "aws_security_group" "bastion_sg" {
  name        = "bastion-sg"
  description = "Allow SSH to Bastion Host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from Internet"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "Bastion-SG" }
}

# B. Public CLB SG
resource "aws_security_group" "clb_sg" {
  name        = "clb-sg"
  description = "Allow HTTP access to CLB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "CLB-Web-Access-SG" }
}

# C. Public Instance SG (Proxies)
resource "aws_security_group" "public_sg" {
  name        = "public-sg"
  description = "Allow SSH, HTTP, and CLB Health Checks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "HTTP from CLB SG"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.clb_sg.id]
  }

  ingress {
    description = "HTTP from Internet (optional direct access)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# D. Internal LB SG
resource "aws_security_group" "lb_sg" {
  name        = "internal-lb-sg"
  description = "Allow traffic from public-sg instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from public-sg"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.public_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "internal-lb-sg" }
}

# E. Private Instance SG (Backends)
# --- CRITICAL: Only accepts SSH from Bastion SG ---
resource "aws_security_group" "private_sg" {
  name        = "private-sg"
  description = "Allow SSH from Bastion and HTTP from Internal ALB"
  vpc_id      = aws_vpc.main.id

  # 1. SSH from Bastion ONLY
  ingress {
    description     = "SSH from Bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # 2. HTTP from Internal ALB
  ingress {
    description     = "HTTP from Internal ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "private-sg" }
}

# -------------------------------------------------------------------------
# 4. Internal Application Load Balancer (ALB)
# -------------------------------------------------------------------------
resource "aws_lb" "internal" {
  name               = "my-internal-alb"
  internal           = true
  load_balancer_type = "application"
  subnets            = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_groups    = [aws_security_group.lb_sg.id]

  tags = { Name = "Internal-ALB" }
}

resource "aws_lb_target_group" "private_tg" {
  name        = "private-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.private_tg.arn
  }
}

# -------------------------------------------------------------------------
# 5. EC2 Instances
# -------------------------------------------------------------------------

# --- A. Bastion Host (JUMP BOX) ---
resource "aws_instance" "bastion" {
  ami                         = "ami-0c02fb55956c7d316"
  instance_type               = "t3.micro"
  key_name                    = aws_key_pair.mykk.key_name
  subnet_id                   = aws_subnet.public_a.id
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  associate_public_ip_address = true

  tags = { Name = "Bastion-Host" }
}

# --- B. Public Proxies (Nginx) ---
resource "aws_instance" "nginx1" {
  ami                         = "ami-0c02fb55956c7d316"
  instance_type               = "t3.small"
  vpc_security_group_ids      = [aws_security_group.public_sg.id]
  key_name                    = aws_key_pair.mykk.key_name
  subnet_id                   = aws_subnet.public_a.id
  associate_public_ip_address = true

  user_data_base64 = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras enable nginx1
    yum install nginx -y
    
    cat > /etc/nginx/conf.d/reverse-proxy.conf << EOL
    server {
        listen 80;
        resolver 10.0.0.2 valid=5s; 
        set \$backend "${aws_lb.internal.dns_name}";
        
        proxy_connect_timeout 60s; 
        proxy_send_timeout 60s;    
        proxy_read_timeout 60s;    
        
        location / {
            proxy_pass http://\$backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }
    }
    EOL
    
    systemctl enable nginx
    systemctl start nginx
    systemctl reload nginx
  EOF
  )

  tags       = { Name = "nginx1-public-reverse-proxy" }
  depends_on = [aws_lb.internal]
}

resource "aws_instance" "nginx2" {
  ami                         = "ami-0c02fb55956c7d316"
  instance_type               = "t3.small"
  vpc_security_group_ids      = [aws_security_group.public_sg.id]
  key_name                    = aws_key_pair.mykk.key_name
  subnet_id                   = aws_subnet.public_b.id
  associate_public_ip_address = true

  user_data_base64 = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras enable nginx1
    yum install nginx -y
    
    cat > /etc/nginx/conf.d/reverse-proxy.conf << EOL
    server {
        listen 80;
        resolver 10.0.0.2 valid=5s; 
        set \$backend "${aws_lb.internal.dns_name}";
        
        proxy_connect_timeout 60s; 
        proxy_send_timeout 60s;    
        proxy_read_timeout 60s;    
        
        location / {
            proxy_pass http://\$backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }
    }
    EOL
    
    systemctl enable nginx
    systemctl start nginx
    systemctl reload nginx
  EOF
  )

  tags       = { Name = "nginx2-public-reverse-proxy" }
  depends_on = [aws_lb.internal]
}

# --- C. Private Backends (Web Servers) ---
resource "aws_instance" "nginx3" {
  ami                    = "ami-0c02fb55956c7d316"
  instance_type          = "t3.small"
  vpc_security_group_ids = [aws_security_group.private_sg.id]
  key_name               = aws_key_pair.mykk.key_name
  subnet_id              = aws_subnet.private_a.id

  user_data_base64 = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras enable nginx1
    yum install nginx -y
    echo "<h1>Hello from Nginx 3 - Private Instance: $(hostname -i)</h1>" > /usr/share/nginx/html/index.html
    systemctl enable nginx
    systemctl start nginx
  EOF
  )

  tags = { Name = "nginx3-private" }
}

resource "aws_instance" "nginx4" {
  ami                    = "ami-0c02fb55956c7d316"
  instance_type          = "t3.small"
  vpc_security_group_ids = [aws_security_group.private_sg.id]
  key_name               = aws_key_pair.mykk.key_name
  subnet_id              = aws_subnet.private_b.id

  user_data_base64 = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras enable nginx1
    yum install nginx -y
    echo "<h1>Hello from Nginx 4 - Private Instance: $(hostname -i)</h1>" > /usr/share/nginx/html/index.html
    systemctl enable nginx
    systemctl start nginx
  EOF
  )

  tags = { Name = "nginx4-private" }
}

# -------------------------------------------------------------------------
# 6. Public Classic Load Balancer (CLB)
# -------------------------------------------------------------------------
resource "aws_elb" "nginx_clb" {
  name            = "nginx-clb"
  security_groups = [aws_security_group.clb_sg.id]
  subnets         = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  listener {
    instance_port     = 80
    instance_protocol = "http"
    lb_port           = 80
    lb_protocol       = "http"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    target              = "HTTP:80/"
    interval            = 30
  }

  instances = [
    aws_instance.nginx1.id,
    aws_instance.nginx2.id,
  ]

  tags = { Name = "Nginx-Public-CLB" }
}

# Target Group Attachments
resource "aws_lb_target_group_attachment" "nginx3_attach" {
  target_group_arn = aws_lb_target_group.private_tg.arn
  target_id        = aws_instance.nginx3.id
  port             = 80
}

resource "aws_lb_target_group_attachment" "nginx4_attach" {
  target_group_arn = aws_lb_target_group.private_tg.arn
  target_id        = aws_instance.nginx4.id
  port             = 80
}

# -------------------------------------------------------------------------
# 7. Outputs
# -------------------------------------------------------------------------
output "bastion_public_ip" {
  description = "Public IP of Bastion. Use this to jump."
  value       = aws_instance.bastion.public_ip
}

output "nginx1_public_ip" {
  description = "Public IP for nginx1 instance (Proxy)."
  value       = aws_instance.nginx1.public_ip
}

output "classic_load_balancer_dns" {
  description = "Public DNS of the CLB."
  value       = aws_elb.nginx_clb.dns_name
}