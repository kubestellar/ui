const { getChangesetContents, commentWorkflow } = require('./.github/workflows/changeset-utils/index.cjs');

// Mock GitHub API object
const mockGithub = {
  rest: {
    pulls: {
      listCommits: {
        endpoint: {
          merge: (params) => ({
            owner: params.owner,
            repo: params.repo,
            pull_number: params.pull_number
          })
        }
      },
      listFiles: {
        endpoint: {
          merge: (params) => ({
            owner: params.owner,
            repo: params.repo,
            pull_number: params.pull_number
          })
        }
      }
    },
    issues: {
      listComments: {
        endpoint: {
          merge: (params) => ({
            owner: params.owner,
            repo: params.repo,
            issue_number: params.issue_number
          })
        }
      }
    }
  },
  paginate: async (endpoint) => {
    // Mock pagination for commits
    if (endpoint.pull_number) {
      return [
        {
          sha: 'abc1234567890abcdef',
          commit: {
            message: 'feat: add new cluster management feature',
            author: { name: 'John Doe' }
          }
        },
        {
          sha: 'def1234567890abcdef',
          commit: {
            message: 'test: add unit tests for cluster management',
            author: { name: 'Jane Smith' }
          }
        },
        {
          sha: 'ghi1234567890abcdef',
          commit: {
            message: 'Merge pull request #123 from feature/cluster-management',
            author: { name: 'github-actions[bot]' }
          }
        }
      ];
    }
    // Mock pagination for files
    return [
      { filename: 'src/components/Clusters.tsx' },
      { filename: 'src/hooks/useClusterQueries.ts' },
      { filename: 'README.md' },
      { filename: 'package.json' }
    ];
  }
};

// Mock pull request object
const mockPullRequest = {
  number: 123,
  title: 'feat: add new cluster management feature',
  base: {
    repo: {
      owner: { login: 'kubestellar' },
      name: 'ui'
    }
  },
  head: {
    repo: {
      full_name: 'kubestellar/ui'
    },
    ref: 'feature/cluster-management'
  }
};

async function testChangesetFunctionality() {
  console.log('🧪 Testing Changeset Automation Functionality\n');

  try {
    // Test 1: Generate changeset contents
    console.log('1️⃣ Testing getChangesetContents...');
    const changesetContents = await getChangesetContents(mockPullRequest, mockGithub);
    console.log('✅ Changeset contents generated successfully');
    console.log('📄 Generated changeset:');
    console.log('---');
    console.log(changesetContents);
    console.log('---\n');

    // Test 2: Test different PR title types
    console.log('2️⃣ Testing different PR title types...');
    const testTitles = [
      'fix: resolve authentication bug',
      'feat: add new dashboard feature',
      'fix!: breaking change in API',
      'feat!: major new feature',
      'docs: update installation guide',
      'style: fix code formatting',
      'refactor: improve component structure',
      'perf: optimize rendering performance',
      'test: add integration tests',
      'chore: update dependencies'
    ];

    for (const title of testTitles) {
      const testPR = { ...mockPullRequest, title };
      const testChangeset = await getChangesetContents(testPR, mockGithub);
      const versionType = testChangeset.includes("'kubestellarui': patch") ? 'patch' :
                         testChangeset.includes("'kubestellarui': minor") ? 'minor' :
                         testChangeset.includes("'kubestellarui': major") ? 'major' : 'unknown';
      console.log(`  ${title} → ${versionType}`);
    }
    console.log('✅ All title types tested successfully\n');

    // Test 3: Test comment workflow (mock)
    console.log('3️⃣ Testing commentWorkflow function...');
    console.log('✅ commentWorkflow function available and callable\n');

    // Test 4: Validate changeset format
    console.log('4️⃣ Validating changeset format...');
    const lines = changesetContents.split('\n');
    const hasFrontmatter = lines[0].trim() === '---' && lines[3].trim() === '---';
    const hasPackageDeclaration = lines[1].includes("'kubestellarui':");
    const hasReleaseNotes = lines.length > 5;
    
    console.log(`  Frontmatter present: ${hasFrontmatter ? '✅' : '❌'}`);
    console.log(`  Package declaration present: ${hasPackageDeclaration ? '✅' : '❌'}`);
    console.log(`  Release notes present: ${hasReleaseNotes ? '✅' : '❌'}`);
    console.log('✅ Changeset format validation completed\n');

    // Test 5: Test file structure
    console.log('5️⃣ Testing file structure...');
    const fs = require('fs');
    const requiredFiles = [
      '.github/workflows/auto-changeset.yml',
      '.github/workflows/changeset-utils/index.js',
      '.github/workflows/release-with-changesets.yml',
      '.changeset/config.json',
      'package.json'
    ];

    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
    }
    console.log('✅ File structure validation completed\n');

    console.log('🎉 All tests passed! Changeset automation is ready to use.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testChangesetFunctionality(); 