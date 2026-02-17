import 'dotenv/config'; // DEBE ser la primera línea - carga .env antes de todo
import Server from "./models/server";
import './utils/cron'

const server = new Server();