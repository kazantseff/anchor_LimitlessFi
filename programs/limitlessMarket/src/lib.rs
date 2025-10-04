use anchor_lang::prelude::*;
pub mod instructions;
pub mod state;
pub use instructions::*;

declare_id!("BADPqHQ6dqfb2KfHk1JiHzJNWScAfgB4SQyVP283mPuy");

#[program]
pub mod limitless_market {
    use super::*;

    pub fn initialize_vault_handler(
        ctx: Context<InitializeVault>,
        market: Pubkey,
        util_pct: u64,
    ) -> Result<()> {
        initialize_vault(ctx, market, util_pct)
    }

    pub fn initialize_market_handler(
        ctx: Context<InitializeMarket>,
        vault: Pubkey,
        oracle: Pubkey,
        collateral_token: Pubkey,
    ) -> Result<()> {
        initialize_market(ctx, vault, oracle, collateral_token)
    }
}
