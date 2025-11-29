## ----------------------------------------------------
## 1. VPC and Subnets (Public Only)
## ----------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "public-eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = [] 

  # CRITICAL: Nodes in public subnets need public IPs to talk to the internet/control plane
  map_public_ip_on_launch = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                    = "1"
  }

  tags = {
    Environment = "Dev"
    Project     = var.cluster_name
  }
}

## ----------------------------------------------------
## 2. EKS Cluster and Managed Node Group
## ----------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.0.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets

  # CRITICAL FIX 1: Grant the user running Terraform admin rights
  enable_cluster_creator_admin_permissions = true

  # CRITICAL FIX 2: Allow public access (required since nodes are in public subnets)
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    public_workers = {
      name = "public-ng"

      # CRITICAL FIX 3: t3.micro (Free Tier) often fails with EKS due to low RAM.
      # t3.small is the cheapest viable option (~$0.0208/hr).
      instance_types = ["t3.small"]

      min_size     = 1
      max_size     = 3
      desired_size = 2
    }
  }

  tags = {
    Environment = "Dev"
    Project     = var.cluster_name
  }
}

## ----------------------------------------------------
## 3. Outputs
## ----------------------------------------------------
output "kubeconfig_command" {
  description = "Command to update your kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}

output "cluster_endpoint" {
  description = "The endpoint for your Kubernetes API server."
  value       = module.eks.cluster_endpoint
}