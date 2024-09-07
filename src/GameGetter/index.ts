export interface GameGetter {
  getGames(): Promise<Record<string, string>>;
  updateGames(content: Record<string, string>): Promise<void>;
}
