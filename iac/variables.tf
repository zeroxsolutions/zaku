variable "project_name" {
  type     = string
  nullable = false
}

variable "cloudflare_account_id" {
  type     = string
  nullable = false
}

variable "cloudflare_api_token" {
  type      = string
  nullable  = false
  sensitive = true
}

variable "cloudflare_r2_buckets" {
  type    = list(string)
  default = []
}

variable "cloudflare_queues" {
  type    = list(string)
  default = []
}
