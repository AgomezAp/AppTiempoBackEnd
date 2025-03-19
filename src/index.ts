import Server from "./models/server";
import dotenv from 'dotenv'
import './utils/cron'

dotenv.config();
const server = new Server();