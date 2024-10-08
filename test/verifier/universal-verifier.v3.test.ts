import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { calculateQueryHashV3 } from "../utils/query-hash-utils";
import { expect } from "chai";

describe("Universal Verifier V3 validator", function () {
  let verifier: any, v3: any, state: any;
  let signer, signer2;
  let deployHelper: DeployHelper;

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const [merklized, isRevocationChecked, valueArrSize] = [1, 1, 1];
  const nullifierSessionId = "0";
  const verifierId = "21929109382993718606847853573861987353620810345503358891473103689157378049";
  const queryHash = calculateQueryHashV3(
    value,
    schema,
    slotIndex,
    operator,
    claimPathKey,
    valueArrSize,
    merklized,
    isRevocationChecked,
    verifierId,
    nullifierSessionId
  );

  const query = {
    schema,
    claimPathKey,
    operator,
    slotIndex,
    value,
    circuitIds: ["credentialAtomicQueryV3OnChain-beta.1"],
    skipClaimRevocationCheck: false,
    queryHash,
    groupID: 1,
    nullifierSessionID: nullifierSessionId, // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: verifierId,
  };

  const proofJson = require("../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json");
  const stateTransition1 = require("../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json");

  beforeEach(async () => {
    [signer, signer2] = await ethers.getSigners();

    deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const { state: stateContract } = await deployHelper.deployState(["0x0112"]);
    state = stateContract;
    const contracts = await deployHelper.deployValidatorContracts("v3", await state.getAddress());
    v3 = contracts.validator;
    await verifier.addValidatorToWhitelist(await v3.getAddress());
    await verifier.connect();
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition1);
    const data = packV3ValidatorParams(query);
    await verifier.setZKPRequest(32, {
      metadata: "metadata",
      validator: await v3.getAddress(),
      data: data,
    });
    await v3.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await verifier.verifyZKPResponse(
      32,
      inputs,
      pi_a,
      pi_b,
      pi_c,
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    );

    await expect(verifier.submitZKPResponse(32, inputs, pi_a, pi_b, pi_c)).not.to.be.rejected;
    await expect(
      verifier.connect(signer2).submitZKPResponse(32, inputs, pi_a, pi_b, pi_c)
    ).to.be.rejectedWith("UserID does not correspond to the sender");

    // TODO make some test with correct UserID but with wrong challenge
  });
});
