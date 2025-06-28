const path = require('path');
const { readPackageUp } = require('read-package-up');

/**
 * Get formatted commits from a pull request
 * Filters out merge commits and bot commits
 */
const getFormattedCommits = async (pullRequest, github) => {
  const commitOpts = github.rest.pulls.listCommits.endpoint.merge({
    owner: pullRequest.base.repo.owner.login,
    repo: pullRequest.base.repo.name,
    pull_number: pullRequest.number,
  });

  const commits = await github.paginate(commitOpts);

  // Filter merge commits and commits by bots
  const filteredCommits = commits.filter(commit => {
    return (
      !commit.commit.message.startsWith('Merge pull request') &&
      !commit.commit.message.startsWith('Merge branch') &&
      !commit.commit.author.name.startsWith('github-actions[bot]') &&
      !commit.commit.author.name.startsWith('dependabot[bot]') &&
      !commit.commit.author.name.startsWith('asyncapi-bot')
    );
  });

  return filteredCommits.map(commit => {
    return {
      commit_sha: commit.sha.slice(0, 7), // first 7 characters of the commit sha is enough to identify the commit
      commit_message: commit.commit.message,
    };
  });
};

/**
 * Get released packages by analyzing modified files
 * Identifies which packages are affected by the changes
 */
const getReleasedPackages = async (pullRequest, github) => {
  const files = await github.paginate(
    github.rest.pulls.listFiles.endpoint.merge({
      owner: pullRequest.base.repo.owner.login,
      repo: pullRequest.base.repo.name,
      pull_number: pullRequest.number,
    })
  );

  const releasedPackages = [];
  const ignoredFiles = [
    'CHANGELOG.md',
    './changeset/README.md',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.github/workflows/auto-changeset.yml',
    '.github/workflows/changeset-utils/index.js',
  ];

  for (const file of files) {
    if (!ignoredFiles.includes(file.filename)) {
      const cwd = path.resolve(path.dirname(file.filename));
      try {
        const pack = await readPackageUp({ cwd });
        if (pack && pack?.packageJson?.name && !releasedPackages.includes(pack.packageJson.name)) {
          releasedPackages.push(pack.packageJson.name);
        }
      } catch (error) {
        console.debug(`Error reading package for file ${file.filename}:`, error.message);
      }
    }
  }

  // If no packages found, default to the main package
  if (releasedPackages.length === 0) {
    try {
      const mainPackage = await readPackageUp({ cwd: '.' });
      if (mainPackage?.packageJson?.name) {
        releasedPackages.push(mainPackage.packageJson.name);
      }
    } catch (error) {
      console.debug('Error reading main package:', error.message);
    }
  }

  console.debug(
    'Filenames',
    files.map(file => file.filename)
  );
  console.debug('Released packages', releasedPackages);
  return releasedPackages;
};

/**
 * Generate release notes from commit messages
 */
const getReleaseNotes = async (pullRequest, github) => {
  const commits = await getFormattedCommits(pullRequest, github);
  /**
   * Release notes are generated from the commits.
   * Format:
   * - title
   * - commit_sha: commit_message (Array of commits)
   */
  const releaseNotes =
    pullRequest.title +
    '\n\n' +
    commits
      .map(commit => {
        return `- ${commit.commit_sha}: ${commit.commit_message}`;
      })
      .join('\n');

  return releaseNotes;
};

/**
 * Generate changeset contents based on PR title and release notes
 */
const getChangesetContents = async (pullRequest, github) => {
  const title = pullRequest.title;
  const releaseType = title.split(':')[0];
  let releaseVersion = 'patch';

  switch (releaseType) {
    case 'fix':
      releaseVersion = 'patch';
      break;
    case 'feat':
      releaseVersion = 'minor';
      break;
    case 'fix!':
      releaseVersion = 'major';
      break;
    case 'feat!':
      releaseVersion = 'major';
      break;
    case 'docs':
      releaseVersion = 'patch';
      break;
    case 'style':
      releaseVersion = 'patch';
      break;
    case 'refactor':
      releaseVersion = 'patch';
      break;
    case 'perf':
      releaseVersion = 'patch';
      break;
    case 'test':
      releaseVersion = 'patch';
      break;
    case 'chore':
      releaseVersion = 'patch';
      break;
    default:
      releaseVersion = 'patch';
  }

  const releaseNotes = await getReleaseNotes(pullRequest, github);
  const releasedPackages = await getReleasedPackages(pullRequest, github);

  if (releasedPackages.length === 0) {
    console.debug('No packages released');
    return '';
  }

  console.debug('Released packages', releasedPackages);
  console.debug('Release notes', releaseNotes);

  const changesetContents =
    `---\n` +
    releasedPackages
      .map(pkg => {
        return `'${pkg}': ${releaseVersion}`;
      })
      .join('\n') +
    `\n---\n\n${releaseNotes}\n\n`;

  return changesetContents;
};

/**
 * Comment on the pull request with the generated changeset
 * Updates existing comment if one already exists
 */
const commentWorkflow = async (pullRequest, github, changesetContents) => {
  const body = `#### Changeset has been generated for this PR as part of auto-changeset workflow.

<details><summary>Please review the changeset before merging the PR.</summary>

\`\`\`
${changesetContents}
\`\`\`

</details>

[If you are a maintainer or the author of the PR, you can change the changeset by clicking here](https://github.com/${pullRequest.head.repo.full_name}/edit/${pullRequest.head.ref}/.changeset/${pullRequest.number}.md)

> [!TIP]
> If you don't want auto-changeset to run on this PR, you can add the label \`skip-changeset\` to the PR or remove the changeset and change PR title to something other than \`fix:\`, \`feat:\`, \`docs:\`, \`style:\`, \`refactor:\`, \`perf:\`, \`test:\`, or \`chore:\`.`;

  const comments = await github.rest.issues.listComments({
    owner: pullRequest.base.repo.owner.login,
    repo: pullRequest.base.repo.name,
    issue_number: pullRequest.number,
  });

  const comment = comments.data.find(comment =>
    comment.body.includes(
      'Changeset has been generated for this PR as part of auto-changeset workflow.'
    )
  );
  if (comment) {
    await github.rest.issues.updateComment({
      owner: pullRequest.base.repo.owner.login,
      repo: pullRequest.base.repo.name,
      comment_id: comment.id,
      body: body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: pullRequest.base.repo.owner.login,
      repo: pullRequest.base.repo.name,
      issue_number: pullRequest.number,
      body: body,
    });
  }
};

module.exports = {
  getChangesetContents,
  commentWorkflow,
};
