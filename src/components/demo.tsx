import {
  CreditCardForm,
  type CardState,
  type CardValidity,
} from "@/components/ui/credit-card-form";

export default function DemoOne() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <CreditCardForm
        defaultHolder="Rahil Vahora"
        maskMiddle
        onChange={(state: CardState, validity: CardValidity) => {
          // live form output here (analytics, preview, etc.)
          // console.log("live", state, validity);
        }}
        onSubmit={(state, validity) => {
          // send to your API
          alert(JSON.stringify({ state, validity }, null, 2));
        }}
      />
    </main>
  );
}
