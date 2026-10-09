# iac - Terraform infrastructure root

The Cloudflare resources the Workers bind to. It lives inside this repo but is not
an nx project: run `terraform` here directly, never through `nx`.

A product adds what it needs: a module from
[tf-modules](https://github.com/zeroxsolutions/tf-modules) in `main.tf`, its inputs in
`variables.tf`, and the ids its workers read in `outputs.tf`.

## Usage

```bash
# one-time, per machine: create backend.config and development.tfvars from the *.example files
terraform init -backend-config=backend.config -reconfigure
terraform workspace select development || terraform workspace new development
terraform plan  -var-file=development.tfvars
terraform apply -var-file=development.tfvars
```

One workspace per environment, each with its own var-file. `backend.config`, `*.tfvars`,
state and saved plans hold credentials and are gitignored; only `*.example` files are committed.
