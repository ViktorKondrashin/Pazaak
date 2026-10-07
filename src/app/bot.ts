export class Bot {
    TypeOfCards = ["p1","p2","p3","p4","p5","p6","-1","-2","-3","-4","-5","-6",];
    ChosenCardsType: string[] = [];
    CountChosenCard:number = 4;
    IsEndTurning: boolean = false;
    IsStanding: boolean = false;
    ChosenCardOnTurn: string = "";
    constructor()
    {
        let randType;
        this.ChosenCardsType = this.TypeOfCards;
        // for (let i=0;i<this.CountChosenCard;i++)
        // {
        //     randType = Math.floor(Math.random()*(this.TypeOfCards.length));
        //     this.ChosenCardsType[i] = this.TypeOfCards[randType];
        //     //this.TypeOfCards.splice(randType,1);
        // }
        //  console.log(this.ChosenCardsType);
    }
    ThinkingAbtChooseCard()
    {

    }
    
    DesiredCard(sumS:number)
    {
        if (this.CountChosenCard==0)
        {
            return "0";
        }
        let chosencard;
        for (let i=0;i<this.ChosenCardsType.length;i++)
        {
           
            if (this.ChosenCardsType[i][0]=='p')
            {
                if (sumS+parseInt(this.ChosenCardsType[i][1])==20 || sumS+parseInt(this.ChosenCardsType[i][1])==19)
                {
                    chosencard = new String(this.ChosenCardsType[i]);
                    //this.ChosenCardsType.splice(i,1);
                    
                    return chosencard;
                }

            }
            else
            {
                if (sumS>20)
                {
                    if (sumS-parseInt(this.ChosenCardsType[i][1])>17 && sumS-parseInt(this.ChosenCardsType[i][1])<=20)
                    {
                        if (sumS)
                        {
                            chosencard = new String(this.ChosenCardsType[i]);
                            //this.ChosenCardsType.splice(i,1);
                            
                            return chosencard;
                        }

                    }
                }

            }
        }
        return "0";
    }

    Thinking(sumP: number,sumS:number)
    {
        if (sumS==20)
        {
            this.IsStanding = true;
            return;
        }
        
        if (this.DesiredCard(sumS)!="0")
        {
            let CardT = this.DesiredCard(sumS);
            
            this.ChosenCardOnTurn = this.DesiredCard(sumS).toString();
            let NextSumS;
            if (CardT[0]=='p')
            {
                NextSumS=sumS+parseInt(CardT[1]);
            }
            else
            {
                NextSumS=sumS-parseInt(CardT[1]);
            }
            if (sumP>NextSumS && sumP<=20)
            {
                this.IsEndTurning = true;
            }
            else
            {
                this.IsStanding = true;
            }
            
            return;
        }
        
        if (sumS==17 || sumS==18 || sumS==19 || sumS==20)
        {
            if (sumP>sumS && sumP<=20)
            {
                this.IsEndTurning = true;
            }
            else
            {
                this.IsStanding = true;
                //console.log("BOT STANDING")
            }

            return;
        }


        this.IsEndTurning = true;
        

        
    }

    NewRaund()
    {
        this.IsEndTurning = false;
        this.IsStanding = false;
        this.ChosenCardOnTurn = "";
    }

    ThinkingAbtEndTurn()
    {

    }

}
