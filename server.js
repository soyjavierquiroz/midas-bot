const express = require('express');
const bodyParser = require('body-parser');
const botRoutes = require('./routes/botRoutes');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/bot', botRoutes);

app.listen(PORT, () => {
  console.log(`🟢 Midas Bot API corriendo en puerto ${PORT}`);
});
