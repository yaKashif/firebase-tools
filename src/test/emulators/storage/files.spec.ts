import { expect } from "chai";
import { tmpdir } from "os";

import { StoredFileMetadata } from "../../../emulator/storage/metadata";
import { StorageCloudFunctions } from "../../../emulator/storage/cloudFunctions";
import { StorageLayer } from "../../../emulator/storage/files";
import { ForbiddenError, NotFoundError } from "../../../emulator/storage/errors";
import { Persistence } from "../../../emulator/storage/persistence";
import { RulesValidator } from "../../../emulator/storage/rules/utils";
import { UploadService } from "../../../emulator/storage/upload";

const ALWAYS_TRUE_RULES_VALIDATOR = {
  validate: () => Promise.resolve(true),
};

const ALWAYS_FALSE_RULES_VALIDATOR = {
  validate: async () => Promise.resolve(false),
};

describe("files", () => {
  it("can serialize and deserialize metadata", () => {
    const cf = new StorageCloudFunctions("demo-project");
    const metadata = new StoredFileMetadata(
      {
        name: "name",
        bucket: "bucket",
        contentType: "mime/type",
        downloadTokens: ["token123"],
        customMetadata: {
          foo: "bar",
        },
      },
      cf,
      Buffer.from("Hello, World!")
    );

    const json = StoredFileMetadata.toJSON(metadata);
    const deserialized = StoredFileMetadata.fromJSON(json, cf);
    expect(deserialized).to.deep.equal(metadata);
  });

  describe("StorageLayer", () => {
    let _persistence: Persistence;
    let _uploadService: UploadService;

    beforeEach(() => {
      _persistence = new Persistence(getPersistenceTmpDir());
      _uploadService = new UploadService(_persistence);
    });

    describe("handleUploadObject()", () => {
      it("should throw if upload is not finished", () => {
        
      });
    });


    describe("#handleGetObject()", () => {
      it("should return data and metadata", async () => {
        const storageLayer = getStorageLayer(ALWAYS_TRUE_RULES_VALIDATOR);
        const upload = _uploadService.multipartUpload({
          bucketId: "bucket",
          objectId: "dir%2Fobject",
          metadataRaw: `{"contentType": "mime/type"}`,
          dataRaw: Buffer.from("Hello, World!"),
        });
        await storageLayer.handleUploadObject(upload);

        const { metadata, data } = await storageLayer.handleGetObject({
          bucketId: "bucket",
          decodedObjectId: "dir%2Fobject",
        });

        expect(metadata.contentType).to.equal("mime/type");
        expect(data.toString()).to.equal("Hello, World!");
      });

      it("should throw an error if request is not authorized", () => {
        const storageLayer = getStorageLayer(ALWAYS_FALSE_RULES_VALIDATOR);

        expect(
          storageLayer.handleGetObject({
            bucketId: "bucket",
            decodedObjectId: "dir%2Fobject",
          })
        ).to.be.rejectedWith(ForbiddenError);
      });

      it("should throw an error if the object does not exist", () => {
        const storageLayer = getStorageLayer(ALWAYS_TRUE_RULES_VALIDATOR);

        expect(
          storageLayer.handleGetObject({
            bucketId: "bucket",
            decodedObjectId: "dir%2Fobject",
          })
        ).to.be.rejectedWith(NotFoundError);
      });
    });

    const getStorageLayer = (rulesValidator: RulesValidator): StorageLayer =>
      new StorageLayer("project", rulesValidator, _persistence);

    const getPersistenceTmpDir = () => `${tmpdir()}/firebase/storage/blobs`;
  });
});
