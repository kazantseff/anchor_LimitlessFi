import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LimitlessMarket } from "../target/types/limitless_market";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { expect } from "chai";

describe("initialize-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.limitlessMarket as Program<LimitlessMarket>;

  // Test constants
  const WAD = new anchor.BN("1000000000000000000"); // 1e18
  const MAX_BPS = new anchor.BN(10000); // 100%
  const SECONDS_IN_YEAR = new anchor.BN(365 * 24 * 60 * 60);
  const LIQUIDATION_FEE_PCT = new anchor.BN(10); // 10%
  const MAX_LEVERAGE = new anchor.BN(5);
  const MIN_POSITION_SIZE = new anchor.BN("100000000000000000000"); // 100e18

  // Helper function to get market PDA
  function getMarketPDA() {
    const [marketPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market_state")],
      program.programId
    );
    return marketPDA;
  }

  describe("Market Initialization", () => {
    it("should successfully initialize market with correct values", async () => {
      const vault = Keypair.generate().publicKey;
      const oracle = Keypair.generate().publicKey;
      const collateralToken = Keypair.generate().publicKey;
      const marketPDA = getMarketPDA();

      await program.methods
        .initializeMarketHandler(vault, oracle, collateralToken)
        .accountsStrict({
          marketState: marketPDA,
          signer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Fetch and verify market state
      const marketState = await program.account.market.fetch(marketPDA);

      // Check input parameters
      expect(marketState.vault.toBase58()).to.equal(vault.toBase58());
      expect(marketState.oracle.toBase58()).to.equal(oracle.toBase58());
      expect(marketState.collateralToken.toBase58()).to.equal(
        collateralToken.toBase58()
      );

      // Check default values
      expect(marketState.baseDecimals.toString()).to.equal(WAD.toString());
      expect(marketState.maxBps.toString()).to.equal(MAX_BPS.toString());
      expect(marketState.secondsInYear.toString()).to.equal(
        SECONDS_IN_YEAR.toString()
      );
      expect(marketState.liquidationFeePct.toString()).to.equal(
        LIQUIDATION_FEE_PCT.toString()
      );
      expect(marketState.maxLeverage.toString()).to.equal(
        MAX_LEVERAGE.toString()
      );
      expect(marketState.minPositionSize.toString()).to.equal(
        MIN_POSITION_SIZE.toString()
      );

      // Check zero initial values
      expect(marketState.openInterestUsdLong.toString()).to.equal("0");
      expect(marketState.openInterestUsdShort.toString()).to.equal("0");
      expect(marketState.openInterestUnderlyingLong.toString()).to.equal("0");
      expect(marketState.openInterestUnderlyingShort.toString()).to.equal("0");

      // Check bump
      expect(marketState.bump).to.be.a("number");
    });
  });
});
