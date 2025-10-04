use crate::state::Market;
use anchor_lang::prelude::*;

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    vault: Pubkey,
    oracle: Pubkey,
    collateral_token: Pubkey,
) -> Result<()> {
    let state = &mut ctx.accounts.market_state;

    state.initialize(vault, oracle, collateral_token, ctx.bumps.market_state);

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"market_state"],
        bump,
        space = 8 + Market::INIT_SPACE,
    )]
    pub market_state: Account<'info, Market>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
