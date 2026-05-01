const http = require('http');
const { handler } = require('../api/index');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => handler(req, res)).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
