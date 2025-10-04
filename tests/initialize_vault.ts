import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LimitlessMarket } from "../target/types/limitless_market";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getMint,
} from "@solana/spl-token";
import { expect } from "chai";

describe("limitless-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.limitlessMarket as Program<LimitlessMarket>;

  // Test constants
  const WAD = new anchor.BN("1000000000000000000"); // 1e18
  const MAX_UTIL_PCT = new anchor.BN(85); // 85% max utilization
  const DECIMALS = 6;

  // Global test state
  let mintUnderlying: PublicKey;
  let pdas: any;
  let marketPubkey: PublicKey;
  let utilPct: anchor.BN;

  // Helper function to create test mint
  async function createTestMint(decimals: number = DECIMALS) {
    return await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      decimals
    );
  }

  // Helper function to get all PDAs
  function getPDAs(mintUnderlying: PublicKey) {
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_state")],
      program.programId
    );

    const [tokenAccountOwnerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda")],
      program.programId
    );

    const [sharePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint")],
      program.programId
    );

    const [vaultTokenPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), mintUnderlying.toBuffer()],
      program.programId
    );

    return {
      vaultPDA,
      tokenAccountOwnerPda,
      sharePDA,
      vaultTokenPDA,
    };
  }

  // Setup function to initialize vault once for all tests
  before(async () => {
    const marketKeypair = Keypair.generate();
    marketPubkey = marketKeypair.publicKey;
    utilPct = MAX_UTIL_PCT;
    mintUnderlying = await createTestMint();
    pdas = getPDAs(mintUnderlying);

    // Initialize the vault once for all tests
    await program.methods
      .initializeVaultHandler(marketPubkey, utilPct)
      .accountsStrict({
        vaultState: pdas.vaultPDA,
        tokenAccountOwnerPda: pdas.tokenAccountOwnerPda,
        shareMint: pdas.sharePDA,
        vaultTokenAccount: pdas.vaultTokenPDA,
        mintOfTokenBeingSent: mintUnderlying,
        signer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  });

  describe("Vault Initialization", () => {
    it("should successfully initialize a vault with valid parameters", async () => {
      // The vault is already initialized in the before() hook
      // Just verify the transaction was successful by checking the vault state
      const vaultState = await program.account.vault.fetch(pdas.vaultPDA);
      expect(vaultState).to.not.be.undefined;
    });

    it("should initialize vault state with correct values", async () => {
      // Fetch and verify vault state
      const vaultState = await program.account.vault.fetch(pdas.vaultPDA);

      expect(vaultState.market.toBase58()).to.equal(marketPubkey.toBase58());
      expect(vaultState.scaleFactor.toString()).to.equal(WAD.toString());
      expect(vaultState.maxUtilPercentage.toString()).to.equal(
        utilPct.toString()
      );
      expect(vaultState.totalUnderlyingDeposited.toString()).to.equal("0");
      expect(vaultState.totalShares.toString()).to.equal("0");
      expect(vaultState.shareMint.toBase58()).to.equal(
        pdas.sharePDA.toBase58()
      );
      expect(vaultState.pdaBump).to.be.a("number");
    });

    it("should create share mint with correct properties", async () => {
      // Verify share mint properties
      const shareMintInfo = await getMint(provider.connection, pdas.sharePDA);
      const underlyingMintInfo = await getMint(
        provider.connection,
        mintUnderlying
      );

      expect(shareMintInfo.decimals).to.equal(underlyingMintInfo.decimals);
      expect(shareMintInfo.supply.toString()).to.equal("0");
      expect(shareMintInfo.mintAuthority?.toBase58()).to.equal(
        pdas.tokenAccountOwnerPda.toBase58()
      );
      expect(shareMintInfo.freezeAuthority).to.be.null;
    });

    it("should create vault token account with correct properties", async () => {
      // Verify vault token account properties
      const vaultTokenAccount = await getAccount(
        provider.connection,
        pdas.vaultTokenPDA
      );

      expect(vaultTokenAccount.mint.toBase58()).to.equal(
        mintUnderlying.toBase58()
      );
      expect(vaultTokenAccount.owner.toBase58()).to.equal(
        pdas.tokenAccountOwnerPda.toBase58()
      );
      expect(vaultTokenAccount.amount.toString()).to.equal("0");
    });
  });

  describe("PDA Generation", () => {
    it("should generate consistent PDAs for vault state", () => {
      const pdas1 = getPDAs(Keypair.generate().publicKey);
      const pdas2 = getPDAs(Keypair.generate().publicKey);

      // Same program ID should generate same vault state PDA
      expect(pdas1.vaultPDA.toBase58()).to.equal(pdas2.vaultPDA.toBase58());
      expect(pdas1.tokenAccountOwnerPda.toBase58()).to.equal(
        pdas2.tokenAccountOwnerPda.toBase58()
      );
      expect(pdas1.sharePDA.toBase58()).to.equal(pdas2.sharePDA.toBase58());

      // Different mints should generate different vault token account PDAs
      expect(pdas1.vaultTokenPDA.toBase58()).to.not.equal(
        pdas2.vaultTokenPDA.toBase58()
      );
    });

    it("should generate correct PDA seeds", () => {
      const testMint = Keypair.generate().publicKey;
      const pdas = getPDAs(testMint);

      // Verify vault state PDA seed
      const [expectedVaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault_state")],
        program.programId
      );
      expect(pdas.vaultPDA.toBase58()).to.equal(expectedVaultPDA.toBase58());

      // Verify token account owner PDA seed
      const [expectedTokenAccountOwnerPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda")],
          program.programId
        );
      expect(pdas.tokenAccountOwnerPda.toBase58()).to.equal(
        expectedTokenAccountOwnerPda.toBase58()
      );

      // Verify share mint PDA seed
      const [expectedSharePDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("share_mint")],
        program.programId
      );
      expect(pdas.sharePDA.toBase58()).to.equal(expectedSharePDA.toBase58());

      // Verify vault token account PDA seed
      const [expectedVaultTokenPDA] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("token_vault"), testMint.toBuffer()],
          program.programId
        );
      expect(pdas.vaultTokenPDA.toBase58()).to.equal(
        expectedVaultTokenPDA.toBase58()
      );
    });
  });

  describe("Error Cases", () => {
    it("should fail when trying to initialize vault twice", async () => {
      // Try to initialize the vault again (should fail)
      try {
        await program.methods
          .initializeVaultHandler(marketPubkey, utilPct)
          .accountsStrict({
            vaultState: pdas.vaultPDA,
            tokenAccountOwnerPda: pdas.tokenAccountOwnerPda,
            shareMint: pdas.sharePDA,
            vaultTokenAccount: pdas.vaultTokenPDA,
            mintOfTokenBeingSent: mintUnderlying,
            signer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        expect.fail("Expected initialization to fail on second attempt");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Account Validation", () => {
    it("should validate account types and constraints", async () => {
      // Test with wrong system program
      try {
        await program.methods
          .initializeVaultHandler(marketPubkey, utilPct)
          .accountsStrict({
            vaultState: pdas.vaultPDA,
            tokenAccountOwnerPda: pdas.tokenAccountOwnerPda,
            shareMint: pdas.sharePDA,
            vaultTokenAccount: pdas.vaultTokenPDA,
            mintOfTokenBeingSent: mintUnderlying,
            signer: provider.wallet.publicKey,
            systemProgram: TOKEN_PROGRAM_ID, // Wrong program
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        expect.fail(
          "Expected initialization to fail with wrong system program"
        );
      } catch (error) {
        // Should fail with some validation error
        expect(error.message).to.match(
          /AnchorError|account|discriminator|constraint/
        );
      }
    });

    it("should validate token program constraints", async () => {
      // Test with wrong token program
      try {
        await program.methods
          .initializeVaultHandler(marketPubkey, utilPct)
          .accountsStrict({
            vaultState: pdas.vaultPDA,
            tokenAccountOwnerPda: pdas.tokenAccountOwnerPda,
            shareMint: pdas.sharePDA,
            vaultTokenAccount: pdas.vaultTokenPDA,
            mintOfTokenBeingSent: mintUnderlying,
            signer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: SystemProgram.programId, // Wrong program
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        expect.fail("Expected initialization to fail with wrong token program");
      } catch (error) {
        // Should fail with some validation error
        expect(error.message).to.match(
          /AnchorError|account|discriminator|constraint/
        );
      }
    });
  });
});
