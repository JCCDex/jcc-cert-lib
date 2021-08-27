import fetch from "./fetch";
import { Tx, sign } from "jcc_exchange";
import { jtWallet } from "jcc_wallet";
import { fetchSequence, fetchTransaction, submitTransaction } from "./rpc";
const hasha = require("hasha");

export interface CertOptions {
  senderSecret: string;
  receiverAddress: string;
  token: string;
  amount: string;
  issuer?: string;
  nodes: string[];
}

export interface ICert {
  cid: string;
  txHash: string;
}

export default class JccCert {
  private readonly senderSecret: string;
  private readonly senderAddress: string;
  private readonly receiverAddress: string;
  private readonly token: string;
  private readonly amount: string;
  private readonly issuer: string;
  private readonly rpcNodes: string[];

  constructor(options: CertOptions) {
    const { senderSecret, receiverAddress, token, amount, issuer, nodes } = options;
    this.senderSecret = senderSecret;
    this.senderAddress = jtWallet.getAddress(senderSecret);
    this.receiverAddress = receiverAddress;
    this.token = token;
    this.issuer = issuer || "jGa9J9TkqtBcUoHe2zqhVFFbgUVED6o9or";
    this.rpcNodes = nodes;
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

  protected getNode() {
    const node = this.rpcNodes[Math.floor(Math.random() * this.rpcNodes.length)];
    return node;
  }

  protected isSuccess(tx) {
    return tx?.result?.engine_result === "tesSUCCESS";
  }

  protected async saveCert(cid: string): Promise<ICert> {
    const memo = JSON.stringify({ cid });
    const tx = Tx.serializePayment(
      this.senderAddress,
      this.amount,
      this.receiverAddress,
      this.token,
      memo,
      this.issuer
    );
    const copyTx: IPayExchange = Object.assign({}, tx);
    const rpcNode = this.getNode();
    const sequence = await fetchSequence(rpcNode, this.senderAddress);
    copyTx.Sequence = sequence;
    const blob = sign(copyTx, this.senderSecret);
    const res = await submitTransaction(rpcNode, blob);
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
    const nodes = this.rpcNodes;
    let tx: any;
    for (const node of nodes) {
      try {
        const res = await fetchTransaction(node, hash);
        const result = res?.result?.meta?.TransactionResult;
        if (result === "tesSUCCESS") {
          tx = res;
          break;
        } else {
          console.log("transaction is failed: ", res, ", node is: ", node);
        }
      } catch (error) {
        console.log("fetch error: ", error.message, ", node is: ", node);
      }
    }

    const account = tx?.result?.Account;
    const to = tx?.result?.Destination;
    const memoData = tx?.result?.Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? JSON.parse(JccCert.hex2str(memoData)) : null;
    return account === this.senderAddress && this.receiverAddress === to && memo?.cid === cid;
  }
}
