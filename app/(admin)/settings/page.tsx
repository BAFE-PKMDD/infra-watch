"use client";

import { Mail, Megaphone, Settings } from "lucide-react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AutoReplySettingsTab } from "@/components/admin/settings/auto-reply-settings-tab";
import { BannerSettingsTab } from "@/components/admin/settings/banner-settings-tab";
import { MaintenanceSettingsTab } from "@/components/admin/settings/maintenance-settings-tab";
import { ReadOnlyNotice } from "@/components/admin/settings/settings-message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsPage() {
  const { user } = useAuth();
  // Mirrors the server rule (system_settings:update is administrator-only), so staff who can only
  // read see disabled controls instead of an error after pressing Save.
  const canEdit = user?.role === "admin";

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Settings" }]}
      title="System Settings"
      description="Configure site-wide parameters, maintenance mode, the public banner, and automatic acknowledgment of E-Reports and feedback."
    >
      {user && !canEdit ? <ReadOnlyNotice /> : null}

      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="general" className="min-h-9 gap-2 px-3">
            <Settings className="size-4" aria-hidden="true" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="banner" className="min-h-9 gap-2 px-3">
            <Megaphone className="size-4" aria-hidden="true" />
            Public Banner
          </TabsTrigger>
          <TabsTrigger value="auto-reply" className="min-h-9 gap-2 px-3">
            <Mail className="size-4" aria-hidden="true" />
            Auto Reply
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <MaintenanceSettingsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="banner">
          <BannerSettingsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="auto-reply">
          <AutoReplySettingsTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </AdminPageWrapper>
  );
}
