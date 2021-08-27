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

  public async saveCert(content: string | Buffer): Promise<ICert> {
    let cHash;
    if (typeof content === "string") {
      cHash = content;
    } else {
      cHash = await hasha.async(content, { algorithm: "sha256" });
    }

    const memo = JSON.stringify({ cid: cHash });

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
      cid: cHash,
      txHash: res?.result?.tx_json?.hash
    };
  }

  public async checkCert(cid: string, hash: string): Promise<boolean> {
    const nodes = this.rpcNodes;
    let tx: any;
    for (const node of nodes) {
      try {
        const res = await fetchTransaction(node, hash);
        if (!this.isSuccess(res)) {
          console.log("transaction is failed: ", res, ", node is: ", node);
        } else {
          tx = res;
          break;
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
