import jsdom from "jsdom";
import TelegramBotApi from "node-telegram-bot-api";
import { GameGetter } from "./GameGetter";
import { ItchMessage } from "./ItchMessage";

export class ItchBot {
  public bot: TelegramBotApi;
  private _me: TelegramBotApi.User | null = null;
  private gameGetter: GameGetter;

  private COMMANDS = {
    add: "✨ Aggiungi gioco ✨",
    list: "👀 Mostra giochi 👀",
  };

  private waitingUsers: number[] = [];

  constructor(
    token: string,
    options: {
      gameGetter: GameGetter;
    }
  ) {
    this.bot = new TelegramBotApi(token, { polling: true });
    this.gameGetter = options.gameGetter;
  }

  get me() {
    if (!this._me) throw new Error("Bot not initialized");
    return this._me;
  }

  async init() {
    this._me = await this.bot.getMe();
  }

  private addUser(id: number) {
    if (!this.isUserWaiting(id)) this.waitingUsers.push(id);
  }

  private removeUser(id: number) {
    if (!this.isUserWaiting(id)) return;
    this.waitingUsers.splice(this.waitingUsers.indexOf(id), 1);
  }

  private isUserWaiting(id: number) {
    return this.waitingUsers.includes(id);
  }

  async getItchIoGameTitle(url: string) {
    try {
      const response = await fetch(url);

      if (response.status === 200) {
        const html = await response.text();
        const dom = new jsdom.JSDOM(html);
        const titleSelector = dom.window.document.querySelector(".game_title");
        if (titleSelector === null) {
          throw new Error("Impossibile ottenere il titolo della pagina");
        }
        const title = titleSelector.textContent;

        return title;
      } else {
        throw new Error(
          `La pagina ha restituito uno status: ${response.status}`
        );
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async listen() {
    this.bot.on("message", async (msg) => {
      const itchMessage = new ItchMessage(msg);
      if (this.isMention(itchMessage)) {
        await this.handleMention(itchMessage);
        return;
      }

      if (itchMessage.getText() === this.COMMANDS.add) {
        await this.handleAdd(itchMessage);
        return;
      }

      if (itchMessage.getText() === this.COMMANDS.list) {
        await this.handleList(itchMessage);
        return;
      }

      if (this.isWaitingForUrl(itchMessage)) {
        await this.handleUrl(itchMessage);
        return;
      }
    });
  }

  private isMention(msg: ItchMessage) {
    const mention = msg.getMention();
    if (!mention) return false;
    return mention === `@${this.me.username}`;
  }

  private isWaitingForUrl(msg: ItchMessage) {
    const user = msg.getUser();
    if (!user) return false;
    const { id } = user;
    return this.isUserWaiting(id);
  }

  private async handleMention(itchMessage: ItchMessage) {
    const user = itchMessage.getUser();
    if (!user) return;
    const { username } = user;

    this.bot.sendMessage(
      itchMessage.getChatId(),
      `Ciao ${username}!
      
🎲 Sono il tuo bot per la ricerca di Community Copies su itch.io 🎲

Come posso aiutarti?`,
      {
        reply_markup: {
          keyboard: [
            [{ text: this.COMMANDS.add }],
            [{ text: this.COMMANDS.list }],
          ],
          resize_keyboard: true,
        },
      }
    );
  }

  private async handleAdd(itchMessage: ItchMessage) {
    const user = itchMessage.getUser();
    if (!user) return;
    const { id } = user;
    this.addUser(id);
    this.bot.sendMessage(
      itchMessage.getChatId(),
      "Inserisci l'url del gioco \n(es. https://losing-games.itch.io/mausritter)",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
  }

  private async handleList(itchMessage: ItchMessage) {
    const items = await this.gameGetter.getGames();
    const message = Object.entries(items)
      .map(([name, url]) => `- [${name}](${url})`)
      .join("\n");
    this.bot.sendMessage(itchMessage.getChatId(), message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        remove_keyboard: true,
      },
    });
  }

  private async handleUrl(itchMessage: ItchMessage) {
    const user = itchMessage.getUser();
    if (!user) return;
    const { id } = user;
    this.removeUser(id);
    const message = await this.bot.sendMessage(
      itchMessage.getChatId(),
      "Sto cercando il gioco..."
    );

    const itchGame = await itchMessage.getItchioGameFromUrl();
    if (!itchGame) {
      this.bot.editMessageText(
        `Non sono riuscito a trovare niente per: ${itchMessage.getText()}`,
        {
          chat_id: message.chat.id,
          message_id: message.message_id,
        }
      );
      return;
    }

    const { title, url } = itchGame;

    const items = await this.gameGetter.getGames();

    await this.gameGetter.updateGames({
      ...items,
      [title]: url,
    });

    this.bot.editMessageText(
      `Ho aggiunto ${title} alla lista.\nAdesso aspettiamo!`,
      {
        chat_id: message.chat.id,
        message_id: message.message_id,
      }
    );
  }
}
