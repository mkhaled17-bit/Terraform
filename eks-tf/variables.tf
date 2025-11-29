# variables.tf

variable "aws_region" {
  description = "The AWS region to create the resources in."
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "my-public-eks-cluster"
}