
import { Telegraf } from "telegraf";
import { link } from "telegraf/format";

const bot = new Telegraf("7447660458:AAFoFXLKY1brSpjfrOS-PpHUrZb7N7u-ln8");

bot.command("link", ctx =>
	
	ctx.reply(link("Launch", "https://t.me/$SubGameSerfe_bo/$start?startapp=$kentId8961487")),
    
);

bot.launch();
