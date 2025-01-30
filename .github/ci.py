import os
from github import Github

# Read the size limit output
with open('size-limit-output.txt', 'r') as file:
    output = file.read()

# Get environment variables
github_token = os.getenv('GITHUB_TOKEN')
repo_name = os.getenv('GITHUB_REPOSITORY')
pr_number = os.getenv('GITHUB_REF').split('/')[-1]  # Extract PR number from GITHUB_REF

# Ensure all required information is available
if not all([github_token, repo_name, pr_number]):
    print("Missing required information. Ensure this workflow is triggered by a pull request.")
    exit(1)

# Authenticate with GitHub API
g = Github(github_token)
repo = g.get_repo(repo_name)

# Post the comment on the pull request
comment_body = f"""
### 🚦 Size Limit Report
