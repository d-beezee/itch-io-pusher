import { GameGetter } from ".";

export class GistGetter implements GameGetter {
  private token: string;
  private gistId: string;

  constructor({ token, gistId }: { token: string; gistId: string }) {
    this.token = token;
    this.gistId = gistId;
  }

  async getGames() {
    const response = await fetch(
      "https://api.github.com/gists/" + this.gistId,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${this.token}`,
        },
      }
    );

    const data = await response.json();

    if (
      data.files &&
      data.files["itchGames.json"] &&
      data.files["itchGames.json"].content
    ) {
      return JSON.parse(data.files["itchGames.json"].content);
    }
    return false;
  }

  async updateGames(content: Record<string, string>): Promise<void> {
    const response = await fetch(
      "https://api.github.com/gists/" + this.gistId,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${this.token}`,
        },
      }
    );

    const data = await response.json();

    const newData = data;
    newData.files = {
      "itchGames.json": { content: JSON.stringify(content, null, 2) },
    };
    await fetch("https://api.github.com/gists/" + this.gistId, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${this.token}`,
      },
      body: JSON.stringify(newData),
    });
  }
}
