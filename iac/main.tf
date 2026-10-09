terraform {
  backend "s3" {
    use_lockfile = true
  }
}

module "cloudflare" {
  source = "git::https://github.com/zeroxsolutions/tf-modules.git//cloudflare?ref=v2.0.1"

  project_name = var.project_name
  account_id   = var.cloudflare_account_id
  api_token    = var.cloudflare_api_token

  r2_buckets = var.cloudflare_r2_buckets
  queues     = var.cloudflare_queues
}
