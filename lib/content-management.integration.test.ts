import assert from "node:assert/strict";
import { test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, projects } from "@/lib/db/schema";
import {
  deleteManagedContent,
  getActiveAnnouncement,
  getActiveMapLayers,
  getPublicArticles,
  listManagedContent,
  saveManagedContent,
} from "./content-management";

const databaseTest =
  process.env.RUN_CONTENT_DB_TESTS === "1" ? test : test.skip;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function rolledBack(run: (tx: Transaction) => Promise<void>) {
  const rollback = new Error("Rollback content test fixtures");
  await assert.rejects(
    db.transaction(async (tx) => {
      await run(tx);
      throw rollback;
    }),
    (error) => error === rollback,
  );
}
const admin = { id: "content-test-admin", role: "admin" };
const article = {
  title: "[Test] Article",
  url: "https://example.invalid/article",
  source: "[Test] Publisher",
  category: "news",
};

databaseTest(
  "article CRUD applies moderator scope and public project visibility",
  async () => {
    await rolledBack(async (tx) => {
      const marker = crypto.randomUUID();
      const publicProject = `content-public-${marker}`,
        privateProject = `content-private-${marker}`,
        outsideProject = `content-outside-${marker}`;
      await tx.insert(projects).values([
        {
          abemisId: publicProject,
          name: "[Test] Public project",
          status: "ongoing",
          stage: "implementation",
          projectType: "test",
          yearFunded: "2026",
          region: marker,
          program: "INS",
        },
        {
          abemisId: privateProject,
          name: "[Test] Private project",
          status: "proposed",
          stage: "identification",
          projectType: "test",
          yearFunded: "2026",
          region: marker,
          program: "INS",
        },
        {
          abemisId: outsideProject,
          name: "[Test] Other region",
          status: "ongoing",
          stage: "implementation",
          projectType: "test",
          yearFunded: "2026",
          region: "outside-test-region",
          program: "INS",
        },
      ]);
      const moderator = {
        id: "content-test-moderator",
        role: "moderator",
        region: marker,
      };
      const created = await saveManagedContent(
        moderator,
        "articles",
        { ...article, title: marker, projectId: publicProject },
        undefined,
        tx,
      );
      await saveManagedContent(
        admin,
        "articles",
        { ...article, title: marker, projectId: privateProject },
        undefined,
        tx,
      );
      const other = await saveManagedContent(
        admin,
        "articles",
        { ...article, title: marker, projectId: outsideProject },
        undefined,
        tx,
      );
      assert.equal(
        (
          await listManagedContent(
            moderator,
            "articles",
            { search: marker },
            tx,
          )
        ).total,
        2,
      );
      assert.equal((await getPublicArticles({ search: marker }, tx)).total, 2);
      assert.equal(
        (await getPublicArticles({ projectId: privateProject }, tx)).total,
        0,
      );
      assert.equal(
        "addedBy" in
          (await getPublicArticles({ projectId: publicProject }, tx)).data[0],
        false,
      );
      await assert.rejects(
        saveManagedContent(moderator, "articles", article, undefined, tx),
        /assigned scope/,
      );
      await assert.rejects(
        deleteManagedContent(moderator, "articles", other.saved.id, tx),
        /assigned scope/,
      );
      const updated = await saveManagedContent(
        moderator,
        "articles",
        { ...article, title: "Updated test", projectId: publicProject },
        created.saved.id,
        tx,
      );
      assert.equal(
        "title" in updated.saved && updated.saved.title,
        "Updated test",
      );
      await deleteManagedContent(moderator, "articles", created.saved.id, tx);
      assert.equal(
        (
          await tx
            .select()
            .from(articles)
            .where(eq(articles.id, created.saved.id))
        ).length,
        0,
      );
    });
  },
);

databaseTest(
  "announcements enforce one active notice and honor scheduling boundaries",
  async () => {
    await rolledBack(async (tx) => {
      const first = await saveManagedContent(
        admin,
        "announcements",
        { title: "[Test] First", content: "First notice", isActive: true },
        undefined,
        tx,
      );
      assert.equal(
        (await getActiveAnnouncement(new Date(), tx))?.id,
        first.saved.id,
      );
      const second = await saveManagedContent(
        admin,
        "announcements",
        {
          title: "[Test] Scheduled",
          content: "Scheduled notice",
          isActive: true,
          startDate: "2099-01-01T00:00:00Z",
          endDate: "2099-01-03T00:00:00Z",
        },
        undefined,
        tx,
      );
      assert.equal(
        await getActiveAnnouncement(new Date("2098-12-31T00:00:00Z"), tx),
        null,
      );
      assert.equal(
        (await getActiveAnnouncement(new Date("2099-01-02T00:00:00Z"), tx))?.id,
        second.saved.id,
      );
      assert.equal(
        await getActiveAnnouncement(new Date("2099-01-04T00:00:00Z"), tx),
        null,
      );
      await assert.rejects(
        saveManagedContent(
          { id: "citizen", role: "citizen" },
          "announcements",
          { title: "Denied", content: "Denied" },
          undefined,
          tx,
        ),
        /Administrator/,
      );
      await deleteManagedContent(admin, "announcements", second.saved.id, tx);
    });
  },
);

databaseTest(
  "map layer CRUD controls active public overlays and order",
  async () => {
    await rolledBack(async (tx) => {
      const layer = {
        name: "[Test] Layer",
        geoserverUrl: "https://example.invalid/geoserver",
        workspace: "test",
        layerName: "test_layer",
        displayOrder: 9876,
        opacity: 0.5,
        legendShape: "polygon",
        legendColor: "#345678",
      };
      const created = await saveManagedContent(
        admin,
        "map-layers",
        layer,
        undefined,
        tx,
      );
      const active = (await getActiveMapLayers(tx)).find(
        (row) => row.id === created.saved.id,
      );
      assert.equal(active?.displayOrder, 9876);
      assert.equal(active?.opacity, 0.5);
      await saveManagedContent(
        admin,
        "map-layers",
        { ...layer, isActive: false },
        created.saved.id,
        tx,
      );
      assert.equal(
        (await getActiveMapLayers(tx)).some(
          (row) => row.id === created.saved.id,
        ),
        false,
      );
      await assert.rejects(
        saveManagedContent(
          { id: "moderator", role: "moderator" },
          "map-layers",
          layer,
          undefined,
          tx,
        ),
        /Administrator/,
      );
      await deleteManagedContent(admin, "map-layers", created.saved.id, tx);
    });
  },
);
