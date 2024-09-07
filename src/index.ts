import dotenv from "dotenv";
import { GistGetter } from "./GameGetter/GistGetter";
import { ItchBot } from "./ItchBot";

dotenv.config();

if (!process.env.TELEGRAM_TOKEN) {
  throw new Error("TELEGRAM_TOKEN is not defined");
}

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is not defined");
}

const gistGetter = new GistGetter({
  token: process.env.GITHUB_TOKEN,
  gistId: "4653d6c4e53d7146ec3fd4b3e39c0967",
});

const api = new ItchBot(process.env.TELEGRAM_TOKEN, {
  gameGetter: gistGetter,
});

async function start() {
  await api.init();

  api.listen();
}

start();
