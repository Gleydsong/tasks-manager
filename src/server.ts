import app from "./app";
import config from "./config/env";

const port = config.port || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
