export class Card {
    public BackgroundImage: string;
    public CountOfCards: number;
    public TypeCard: string;
    public Htmle: HTMLElement;
    constructor(imageUrl?: string, countC?: number,type?: string)
    {
        this.BackgroundImage = imageUrl ?? '';
        this.CountOfCards = countC ?? 0;
        this.TypeCard = type ?? '';
        this.Htmle = document.createElement("div");
    }

}
