const { createApp } = require('./server/app');

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
