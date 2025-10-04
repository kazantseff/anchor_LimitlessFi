use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub share_mint: Pubkey,
    pub pda_bump: u8,
    pub market: Pubkey,
    pub scale_factor: u64,
    pub max_util_percentage: u64,
    pub total_underlying_deposited: u64,
    pub total_shares: u64,
}

impl Vault {
    pub fn initialize(&mut self, market: Pubkey, util_pct: u64) {
        self.market = market;
        self.scale_factor = 1_000_000_000_000_000_000; // WAD
        self.max_util_percentage = util_pct;
        self.total_underlying_deposited = 0;
        self.total_shares = 0;
    }
}
