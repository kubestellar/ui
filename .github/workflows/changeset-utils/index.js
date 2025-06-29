import path from 'path';
import { readPackageUp } from 'read-package-up';

const getFormattedCommits = async (pullRequest, github) => {
  const commitOpts = github.rest.pulls.listCommits.endpoint.merge({
    owner: pullRequest.base.repo.owner.login,
    repo: pullRequest.base.repo.name,
    pull_number: pullRequest.number,
  });

  const commits = await github.paginate(commitOpts);

  // Filter merge commits and bot commits
  const filteredCommits = commits.filter(commit => {
    return (
      !commit.commit.message.startsWith('Merge pull request') &&
      !commit.commit.message.startsWith('Merge branch') &&
      !commit.commit.author.name.startsWith('kubestellar-bot') &&
      !commit.commit.author.name.startsWith('dependabot[bot]')
    );
  });

  return filteredCommits.map(commit => {
    return {
      commit_sha: commit.sha.slice(0, 7),
      commit_message: commit.commit.message,
    };
  });
};

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
    'README.md',
    'CHANGELOG.md',
    './changeset/README.md',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ];

  for (const file of files) {
    if (!ignoredFiles.includes(file.filename)) {
      const cwd = path.resolve(path.dirname(file.filename));
      const pack = await readPackageUp({ cwd });
      if (pack && pack?.packageJson?.name && !releasedPackages.includes(pack.packageJson.name)) {
        releasedPackages.push(pack.packageJson.name);
      }
    }
  }

  return releasedPackages;
};

const getReleaseNotes = async (pullRequest, github) => {
  const commits = await getFormattedCommits(pullRequest, github);
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
    default:
      releaseVersion = 'patch';
  }

  const releaseNotes = await getReleaseNotes(pullRequest, github);
  const releasedPackages = await getReleasedPackages(pullRequest, github);

  if (releasedPackages.length === 0) {
    return '';
  }

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

const commentWorkflow = async (pullRequest, github, changesetContents) => {
  const body = `#### Changeset has been generated for this PR as part of auto-changeset workflow.\n\n<details><summary>Please review the changeset before merging the PR.</summary>\n\n\`\`\`\n${changesetContents}\`\`\`\n\n</details>\n\n[If you are a maintainer or the author of the PR, you can change the changeset by clicking here](https://github.com/${pullRequest.head.repo.full_name}/edit/${pullRequest.head.ref}/.changeset/${pullRequest.number}.md)\n\n> [!TIP]\n> If you don't want auto-changeset to run on this PR, you can add the label \`skip-changeset\` to the PR or remove the changeset and change PR title to something other than \`fix:\` or \`feat:\`.`;

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
      user: 'kubestellar-bot',
    });
  }
};

export {
  getChangesetContents,
  commentWorkflow,
};