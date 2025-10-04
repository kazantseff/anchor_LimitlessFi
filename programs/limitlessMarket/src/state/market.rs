use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub vault: Pubkey,
    pub oracle: Pubkey,
    pub collateral_token: Pubkey,
    pub base_decimals: u64,
    pub max_bps: u64,
    pub seconds_in_year: u64,
    pub liquidation_fee_pct: u64,
    pub max_leverage: u64,
    pub min_position_size: u128,
    pub open_interest_usd_long: u64,
    pub open_interest_usd_short: u64,
    pub open_interest_underlying_long: u64,
    pub open_interest_underlying_short: u64,
    pub bump: u8,
}

impl Market {
    pub fn initialize(
        &mut self,
        vault: Pubkey,
        oracle: Pubkey,
        collateral_token: Pubkey,
        bump: u8,
    ) {
        self.vault = vault;
        self.oracle = oracle;
        self.collateral_token = collateral_token;
        self.base_decimals = 1_000_000_000_000_000_000; // WAD
        self.max_bps = 10000; // 100%
        self.seconds_in_year = 365 * 24 * 60 * 60;
        self.liquidation_fee_pct = 10; // 10%
        self.max_leverage = 5;
        self.min_position_size = 1_000_000_000_000_000_000 * 100; // 100e18
        self.open_interest_usd_long = 0;
        self.open_interest_usd_short = 0;
        self.open_interest_underlying_long = 0;
        self.open_interest_underlying_short = 0;
        self.bump = bump;
    }
}
