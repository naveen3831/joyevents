import MerchantLayout from "@/components/MerchantLayout";
import AccountSettingsContent from "@/components/AccountSettingsContent";

const MerchantSettings = () => {
  return (
    <MerchantLayout>
      <AccountSettingsContent backLink={{ to: "/merchant-dashboard", label: "Back to Dashboard" }} />
    </MerchantLayout>
  );
};

export default MerchantSettings;

