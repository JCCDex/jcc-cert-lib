import { ChainOption, Transaction } from "@jccdex/jingtum-lib";
import fetch from "@jccdex/jingtum-lib/lib/fetch";
const hasha = require("hasha");

export interface CertOptions {
  senderSecret: string;
  receiverAddress: string;
  token: string;
  amount: string;
  issuer?: string;
  nodes: string[];
  chain: ChainOption | string;
}

export interface ICert {
  cid: string;
  txHash: string;
}

export default class JccCert extends Transaction {
  private readonly senderSecret: string;
  private readonly senderAddress: string;
  private readonly receiverAddress: string;
  private readonly token: string;
  private readonly amount: string;
  private readonly issuer: string;

  constructor(options: CertOptions) {
    const { senderSecret, receiverAddress, token, amount, issuer, nodes, chain } = options;
    super(chain, nodes);
    this.senderSecret = senderSecret;
    this.senderAddress = this.getAddress(senderSecret);
    this.receiverAddress = receiverAddress;
    this.token = token;
    this.issuer = issuer || "jGa9J9TkqtBcUoHe2zqhVFFbgUVED6o9or";
    this.amount = amount;
  }

  static async fetchNodes(): Promise<string[]> {
    const res: any = await fetch("https://gateway.swtc.top/rpcservice");
    return res.rpcpeers;
  }

  static hex2str(hex: string): string {
    const buf = Buffer.from(hex, "hex");
    return buf.toString("utf8");
  }

  protected isSuccess(tx) {
    return tx?.result?.engine_result === "tesSUCCESS";
  }

  protected async saveCert(cid: string): Promise<ICert> {
    const memo = JSON.stringify({ cid });
    const res = await this.payment({
      secret: this.senderSecret,
      address: this.senderAddress,
      to: this.receiverAddress,
      amount: this.amount,
      token: this.token,
      issuer: this.issuer,
      memo
    });

    if (!this.isSuccess(res)) {
      throw new Error(JSON.stringify(res));
    }
    return {
      cid,
      txHash: res?.result?.tx_json?.hash
    };
  }

  /**
   * hash上链存证
   *
   * @param {string} hash
   * @returns {Promise<ICert>}
   * @memberof JccCert
   */
  public async saveHashCert(hash: string): Promise<ICert> {
    return await this.saveCert(hash);
  }

  /**
   * buffer上链存证
   *
   * @param {Buffer} buf
   * @returns {Promise<ICert>}
   * @memberof JccCert
   */
  public async saveBufferCert(buf: Buffer): Promise<ICert> {
    const hash = await hasha.async(buf, { algorithm: "sha256" });
    return await this.saveCert(hash);
  }

  /**
   * 校验存证hash
   *
   * @param {string} cid 文件hash
   * @param {string} hash 交易hash
   * @returns {Promise<boolean>}
   * @memberof JccCert
   */
  public async checkCert(cid: string, hash: string): Promise<boolean> {
    const tx: any = await this.fetchTransaction(hash);
    const account = tx?.result?.Account;
    const to = tx?.result?.Destination;
    const memoData = tx?.result?.Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? JSON.parse(JccCert.hex2str(memoData)) : null;
    return account === this.senderAddress && this.receiverAddress === to && memo?.cid === cid;
  }
}
