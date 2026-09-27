resource "github_actions_secret" "codecov" {
  repository      = github_repository.repo.name
  secret_name     = "CODECOV_TOKEN"
  value = var.codecov_token
}