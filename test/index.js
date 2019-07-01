const google = require('../lib/google');

google.resultsPerPage = 25
var nextCounter = 0

google('node.js best practices', function (err, res){
  if (err) console.error(err)
// console.log(res);
  for (var i = 0; i < res.links.length; ++i) {
    var link = res.links[i];
    console.log(link.title + ' - ' + link.href)
    console.log(link.description + "\n")
  }

  if (nextCounter < 4) {
    nextCounter += 1
    if (res.next) res.next()
  }
})