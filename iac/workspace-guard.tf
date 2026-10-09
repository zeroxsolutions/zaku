# Which workspace is selected lives in a local file under .terraform/, not in the
# backend, so `rm -rf .terraform` or `init -reconfigure` silently drops the selection
# back to `default`. A plan there is not an error - it reports every resource as
# "to add", because nothing exists under that workspace - and an apply would build a
# second, parallel set of real infrastructure beside the one already running.
#
# The check names the one workspace that is always wrong rather than listing the ones
# that are right: `default` is what Terraform selects when nobody chose, no environment
# in this org is named that, and a permit-list would need revisiting in every root the
# first time an environment is added.
resource "terraform_data" "workspace_guard" {
  lifecycle {
    precondition {
      condition     = terraform.workspace != "default"
      error_message = "No environment workspace is selected. Run `terraform workspace select <environment>` first - applying from `default` builds a second, parallel set of infrastructure."
    }
  }
}
