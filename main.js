const Apify = require('apify')
const { URL } = require('url')

// Apify.utils contains various utilities, e.g. for logging.
// Here we turn off the logging of unimportant messages.
const { log } = Apify.utils
log.setLevel(log.LEVELS.WARNING)

const NAMES = [
  'baby shark'
]

function underscorify (words) {
  return words.replace(/\s/g, '_')
}

// Apify.main() function wraps the crawler logic (it is optional).
Apify.main(async () => {
  const baseUrl = 'https://en.wikipedia.org/'
  const requestQueue = await Apify.openRequestQueue()

  const urls = NAMES.map(name => baseUrl + 'wiki/' + underscorify(name))

  for (const url of urls) {
    await requestQueue.addRequest({ url })
  }

  const handlePageFunction = async ({ request, $ }) => {
    if ($('table#disambigbox').length) {
      console.log(request.url + ' is a disambiguation URL')
      return
    }

    const reqPathname = new URL(request.url).pathname

    const firstWikiLink = $('.mw-parser-output')
      .children()
      .not('table')
      .not('.toc')
      .not('.thumb')
      .not('.navigation-not-searchable')
      .find('a[href]')
      .map((i, el) => el.attribs.href)
      // .map((i, el) => el.pathname)
      .filter((i, path) => path.startsWith('/wiki/'))
      .not((i, path) => path.includes(':'))
      .filter((i, path) => path !== reqPathname)
      // .first()
      .get()
      .shift()

    console.log('firstWikiLink', firstWikiLink)

    const firstWikiUrl = new URL(firstWikiLink, baseUrl)

    await requestQueue.addRequest({ url: firstWikiUrl.href })
  }

  // This function will be called for each URL to crawl.
  // It accepts a single parameter, which is an object with the following fields:
  // - request: an instance of the Request class with information such as URL and HTTP method
  // - body: contains raw HTML of the page
  // - $: the cheerio object containing parsed HTML
  // handlePageFunction: async ({ request, body, $ }) => {
  //   console.log(`Processing ${request.url}...`)

  //   // Extract data from the page using cheerio.
  //   const title = $('title').text()
  //   const h1texts = []
  //   $('h1').each((index, el) => {
  //     h1texts.push({
  //       text: $(el).text()
  //     })
  //   })

  // Store the results to the default dataset. In local configuration,
  // the data will be stored as JSON files in ./apify_storage/datasets/default
  //   await Apify.pushData({
  //     url: request.url,
  //     title,
  //     h1texts,
  //     body
  //   })
  // },

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    handlePageFunction,

    minConcurrency: 10,
    maxConcurrency: 50,
    maxRequestRetries: 1,
    handlePageTimeoutSecs: 60,

    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed twice.`)
    }
  })

  // Run the crawler and wait for it to finish.
  await crawler.run()

  console.log('Crawler finished.')
})
