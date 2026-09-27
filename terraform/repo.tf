resource "github_repository" "repo" {
  name        = "data-munger-mcp"
  description = "MCP server for data munging pipelines"
  visibility  = "public"

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = false

  topics = []

  allow_auto_merge       = true
  allow_merge_commit     = false
  allow_squash_merge     = true
  allow_rebase_merge     = false
  delete_branch_on_merge = false

  merge_commit_message        = "PR_TITLE"
  merge_commit_title          = "MERGE_MESSAGE"
  squash_merge_commit_message = "COMMIT_MESSAGES"
  squash_merge_commit_title   = "COMMIT_OR_PR_TITLE"

  allow_forking = true
  archived      = false
  is_template   = false
}

resource "github_branch_protection" "master" {
  repository_id = github_repository.repo.node_id
  pattern       = "master"

  required_status_checks {
    strict   = true
    contexts = ["lint", "test (20)", "build"]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    restrict_dismissals             = false
  }

  enforce_admins = false

  require_signed_commits           = false
  required_linear_history          = false
  allows_force_pushes              = false
  allows_deletions                 = false
  require_conversation_resolution  = false
}

resource "github_repository_ruleset" "protect_version_tags" {
  name        = "Protect version tags"
  target      = "tag"
  enforcement = "active"
  repository  = github_repository.repo.name

  conditions {
    ref_name {
      include = ["refs/tags/v*"]
      exclude = []
    }
  }

  rules {
    deletion = true
  }
}