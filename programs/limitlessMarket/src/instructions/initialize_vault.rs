use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::state::Vault;

pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    market: Pubkey,
    util_pct: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_state;

    // Initialize state
    state.initialize(
        market,
        util_pct,
        ctx.accounts.share_mint.key(),
        ctx.bumps.vault_state,
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init_if_needed,
        payer  = signer,
        seeds  = [b"vault_state"],
        bump,
        space  = 8 + Vault::INIT_SPACE,
    )]
    pub vault_state: Account<'info, Vault>,

    #[account(seeds = [b"token_account_owner_pda"], bump)]
    /// CHECK: program‑derived signer
    /// holds vault underlying tokens, and mints shares
    pub token_account_owner_pda: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [b"share_mint"],
        bump,
        mint::decimals   = mint_of_token_being_sent.decimals,
        mint::authority  = token_account_owner_pda,
    )]
    pub share_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [b"token_vault", mint_of_token_being_sent.key().as_ref()],
        bump,
        token::mint      = mint_of_token_being_sent,
        token::authority = token_account_owner_pda,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub mint_of_token_being_sent: Account<'info, Mint>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
