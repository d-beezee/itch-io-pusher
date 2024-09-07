import jsdom from "jsdom";
import TelegramBotApi from "node-telegram-bot-api";

export class ItchMessage {
  constructor(private msg: TelegramBotApi.Message) {}

  getMention() {
    const entities = this.msg.entities;
    if (!entities) return false;

    const commandEntity = entities.find((entity) => entity.type === "mention");
    if (!commandEntity) return false;

    const mention = this.msg.text?.substring(
      commandEntity.offset,
      commandEntity.offset + commandEntity.length
    );

    return mention;
  }

  getUser() {
    const { id } = this.msg.from || {};
    if (!id) return false;
    const { username } = this.msg.from || {};
    if (!username) return false;
    return { id, username };
  }

  getText() {
    return this.msg.text;
  }

  getChatId() {
    return this.msg.chat.id;
  }

  async getItchioGameFromUrl() {
    const text = this.getText();
    if (!text) return false;
    const title = await this.getItchIoGameTitle(text);

    if (!title) return false;

    return {
      url: text,
      title,
    };
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
}
