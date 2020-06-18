#!/usr/bin/env node

require('dotenv').config()

const [, , org, repo] = process.argv

let { graphql } = require('@octokit/graphql')
graphql = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`
  }
})

DumpDependabotAlerts()

async function DumpDependabotAlerts() {
  let pagination = null
  const query =
    `query ($org: String! $repo: String! $cursor: String){
      repository(owner: $org name: $repo) {
        name
        vulnerabilityAlerts(first: 100 after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
          nodes {
            id
            securityAdvisory {
              ...advFields
            }
            securityVulnerability {
              package {
                ...pkgFields
              }
              vulnerableVersionRange
            }
            vulnerableManifestFilename
            vulnerableManifestPath
            vulnerableRequirements
          }
        }
      }
    }

    fragment advFields on SecurityAdvisory {
      ghsaId
      permalink
      severity
      description
      summary
    }

    fragment pkgFields on SecurityAdvisoryPackage {
      name
      ecosystem
    }`
    
  try {
    console.log("org,repo,package,ecosystem,summary,severity,permalink")
    let hasNextPage = false
    do {
      const getVulnResult = await graphql({ query, org: org, repo: repo, cursor: pagination })
      hasNextPage = getVulnResult.repository.vulnerabilityAlerts.pageInfo.hasNextPage
      const vulns = getVulnResult.repository.vulnerabilityAlerts.nodes

      for (const vuln of vulns) {
          console.log(`${org},${repo},${vuln.securityVulnerability.package.name},${vuln.securityVulnerability.package.ecosystem},${vuln.securityAdvisory.summary},${vuln.securityAdvisory.severity},${vuln.securityAdvisory.permalink}`)
        }

      if (hasNextPage) {
        pagination = getVulnResult.repository.vulnerabilityAlerts.pageInfo.endCursor
      }
    } while (hasNextPage)
  } catch (error) {
    console.log('Request failed:', error.request)
    console.log(error.message)
  }
}