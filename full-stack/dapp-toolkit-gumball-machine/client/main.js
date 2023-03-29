import {
  RadixDappToolkit,
  ManifestBuilder,
  Decimal,
  Bucket,
  Expression,
  Address
} from '@radixdlt/radix-dapp-toolkit'


const XRD = 'resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp'

const examples = (accountA, accountB, accountC, componentAddress1, componentAddress2, gumballResourceAddress, adminBadge) => {
  const example1 = `
    CALL_METHOD Address("${accountA}") "withdraw" Address("${XRD}") Decimal("10");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("10") Address("${XRD}") Bucket("xrd");
    CALL_METHOD Address("${componentAddress1}") "buy_gumball" Bucket("xrd");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("1") Address("${gumballResourceAddress}") Bucket("gumball");
    CALL_METHOD Address("${accountA}") "deposit" Bucket("gumball");
    CALL_METHOD Address("${accountB}") "deposit_batch" Expression("ENTIRE_WORKTOP");
  `

  const example2 = `
    CALL_METHOD Address("${accountA}") "withdraw" Address("${XRD}") Decimal("0.5");
    CALL_METHOD Address("${accountB}") "withdraw" Address("${XRD}") Decimal("0.5");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("1") Address("${XRD}") Bucket("xrd");
    CALL_METHOD Address("${componentAddress1}") "buy_gumball" Bucket("xrd");
    CALL_METHOD Address("${accountA}") "deposit_batch" Expression("ENTIRE_WORKTOP");
  `

  const example3 = `
    CALL_METHOD Address("${accountA}") "withdraw" Address("${XRD}") Decimal("5");
    CALL_METHOD Address("${accountA}") "withdraw" Address("${XRD}") Decimal("3");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("2") Address("${XRD}") Bucket("Delta");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("2.5") Address("${XRD}") Bucket("Echo");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("3.5") Address("${XRD}") Bucket("Foxtrot");
    CALL_METHOD Address("${componentAddress1}") "buy_gumball" Bucket("Delta");
    TAKE_FROM_WORKTOP_BY_AMOUNT Decimal("1") Address("${XRD}") Bucket("Golf");
    CALL_METHOD Address("${accountA}") "deposit_batch" Bucket("Echo") Bucket("Foxtrot");
    CALL_METHOD Address("${accountC}") "deposit" Bucket("Golf");
    CALL_METHOD Address("${accountA}") "deposit_batch" Expression("ENTIRE_WORKTOP");
  `

  const example4 = new ManifestBuilder()
    .createProofFromAccount(accountA, adminBadge)
    .callMethod(componentAddress1, 'withdraw_funds', [])
    .callMethod(accountA, 'deposit_batch', [Expression('ENTIRE_WORKTOP')]).build().toString()

  const example5 = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountB, 10, XRD)
    .createProofFromAccount(accountA, adminBadge)
    .takeFromWorktopByAmount(5, XRD, 'xrd')
    .callMethod(componentAddress1, 'buy_gumball', [Bucket('xrd')])
    .callMethod(componentAddress1, 'withdraw_funds', [])
    .callMethod(accountA, 'deposit_batch', [Expression('ENTIRE_WORKTOP')]).build().toString()

  const example6 = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountA, 2, XRD)
    .takeFromWorktopByAmount(2, XRD, 'xrd')
    .callMethod(componentAddress1, 'buy_gumball', [Bucket('xrd')])
    .takeFromWorktop(XRD, 'restxrd')
    .callMethod(componentAddress2, 'buy_gumball', [Bucket('restxrd')])
    .callMethod(accountB, 'deposit_batch', [Expression('ENTIRE_WORKTOP')]).build().toString()

  return {
    example1,
    example2,
    example3,
    example4,
    example5,
    example6
  }
}

const dAppId = 'account_tdx_22_1prd6gfrqj0avlyxwldgyza09fp7gn4vjmga7clhe9p2qv0qt58'

const rdt = RadixDappToolkit(
  { dAppDefinitionAddress: dAppId, dAppName: 'GumballMachine' },
  (requestData) => {
    requestData({
      accounts: { quantifier: 'atLeast', quantity: 1 },
    }).map(({ data: { accounts } }) => {
      // add accounts to dApp application state
      console.log("account data: ", accounts)
      document.getElementById('accountName').innerText = accounts[0].label
      document.getElementById('accountAddress').innerText = accounts[0].address
      accountAddress = accounts[0].address
    })
  },
  {
    networkId: 12, // 12 is for RCnet 01 for Mainnet
    onDisconnect: () => {
      // clear your application state
    },
    onInit: ({ accounts }) => {
      // set your initial application state
      console.log("onInit accounts: ", accounts)
      if (accounts.length > 0) {
        document.getElementById('accountName').innerText = accounts[0].label
        document.getElementById('accountAddress').innerText = accounts[0].address
        accountAddress = accounts[0].address
      }
    },
  }
)
console.log("dApp Toolkit: ", rdt)


// There are four classes exported in the Gateway-SDK These serve as a thin wrapper around the gateway API
// API docs are available @ https://betanet-gateway.redoc.ly/
// https://kisharnet-gateway.radixdlt.com/swagger/index.html
import { TransactionApi, StateApi, StatusApi, StreamApi, Configuration } from "@radixdlt/babylon-gateway-api-sdk";

// Instantiate Gateway SDK
const transactionApi = new TransactionApi()
const stateApi = new StateApi();
const statusApi = new StatusApi();
const streamApi = new StreamApi();

// Global states
let accountAddress // User account address
let componentAddress //= "component_tdx_c_1qdmsqjknc9luw7ps5s9ykw9g6mn5fh8gdatgcy0tx2nqdpvx9c" //GumballMachine component address
let resourceAddress // GUM resource address
let xrdAddress = "resource_tdx_c_1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq40v2wv"
// You can use this packageAddress to skip the dashboard publishing step
// package_tdx_c_1qp33k08x0khkr0ha9cmzutsn5qzaxaasq4w3stnxkyzs8gnx2s
// component_tdx_c_1qdmsqjknc9luw7ps5s9ykw9g6mn5fh8gdatgcy0tx2nqdpvx9c 


// ************ Instantiate component and fetch component and resource addresses *************
document.getElementById('instantiateComponent').onclick = async function () {
  let packageAddress = document.getElementById("packageAddress").value;
  let flavor = document.getElementById("flavor").value;

  let manifest = new ManifestBuilder()
    .callFunction(packageAddress, "GumballMachine", "instantiate_gumball_machine", [Decimal("10"), `"${flavor}"`])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();
  console.log("Instantiate Manifest: ", manifest)
  // Send manifest to extension for signing
  let rcManifest = `
CALL_FUNCTION
    Address("${packageAddress}")
    "GumballMachine"
    "instantiate_gumball_machine"
    Decimal("5")
    "GUM";
CALL_METHOD
    Address("${accountAddress}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP");
  `
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Intantiate WalletSDK Result: ", result.value)

  // ************ Fetch the transaction status from the Gateway API ************
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Instantiate TransactionApi transaction/status:', status)

  // ************ Fetch component address from gateway api and set componentAddress variable **************
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  })
  console.log('Instantiate Committed Details Receipt', commitReceipt)

  // ****** Set componentAddress variable with gateway api commitReciept payload ******
  componentAddress = commitReceipt.details.referenced_global_entities[0]
  document.getElementById('componentAddress').innerText = componentAddress;
  // ****** Set resourceAddress variable with gateway api commitReciept payload ******
  resourceAddress = commitReceipt.details.referenced_global_entities[1]
  document.getElementById('gumAddress').innerText = resourceAddress;
}

document.getElementById('buyGumball').onclick = async function () {
  let manifest = new ManifestBuilder()
    .callMethod(accountAddress, "withdraw", [Address(xrdAddress), Decimal("33")])
    .takeFromWorktop(xrdAddress, "xrd_bucket")
    .callMethod(componentAddress, "buy_gumball", [Bucket("xrd_bucket")])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();

  console.log('buy_gumball manifest: ', manifest)

  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Buy Gumball getMethods Result: ", result)

  // Fetch the transaction status from the Gateway SDK
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Buy Gumball TransactionAPI transaction/status: ', status)

  // fetch commit reciept from gateway api 
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  })
  console.log('Buy Gumball Committed Details Receipt', commitReceipt)

  // Show the receipt on the DOM
  document.getElementById('receipt').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
};

const getExampleValues = () => [
  document.getElementById('account-input-a').value,
  document.getElementById('account-input-b').value,
  document.getElementById('account-input-c').value,
  document.getElementById('gumball-component-1').value,
  document.getElementById('gumball-component-2').value,
  document.getElementById('gumball-resource').value,
  document.getElementById('admin-badge').value,
]

const sendExampleTx = (number) => {
  console.log(examples(...getExampleValues())[`example${number}`])
  rdt.sendTransaction({
    transactionManifest: examples(...getExampleValues())[`example${number}`],
    version: 1,
  })
}

document.getElementById(`example-1`).onclick = () => sendExampleTx(1)
document.getElementById(`example-2`).onclick = () => sendExampleTx(2)
document.getElementById(`example-3`).onclick = () => sendExampleTx(3)
document.getElementById(`example-4`).onclick = () => sendExampleTx(4)
document.getElementById(`example-5`).onclick = () => sendExampleTx(5)
document.getElementById(`example-6`).onclick = () => sendExampleTx(6)