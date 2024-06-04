const express = require('express');

const app = express();
let concurrentUsers = 0;

app.use((_, __, next) => {
  concurrentUsers++;
  console.log(`Concurrent users: ${concurrentUsers}`);
  next();
});

app.get('/', async (_, res) => {
  // Introduce random error based on number of concurrent users. Stable until ~30 or so, then slowly increases error rate
  const errorChance = Math.max(1 - (1.5 * Math.E ** (-0.01 * concurrentUsers)))

  if (Math.random() < errorChance) {
    res.status(500).send('Server error');
    concurrentUsers--;
    return;
  }

  // Slow down the response based on the number of concurrent users
  const time = 150 + 0.5 * concurrentUsers ** 1.3;
  console.log(`Waiting for ${time}ms`);
  await new Promise((resolve) => setTimeout(resolve, time));
  res.send('Ok');
  concurrentUsers--;
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
