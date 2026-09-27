resource "github_repository_dependabot_security_updates" "deps" {
  repository = github_repository.repo.name
  enabled    = false
}