resource "github_actions_repository_permissions" "actions" {
  repository      = github_repository.repo.name
  allowed_actions = "all"
  enabled         = true
}