import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegistroForm } from "./registro-form";

const signUpMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: signUpMock } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RegistroForm", () => {
  it("registra correctamente los valores de los inputs (regresión: Campo sin forwardRef rompía esto)", async () => {
    render(<RegistroForm />);

    fireEvent.change(screen.getByLabelText("Nombre visible"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "password123" } });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledTimes(1);
    });

    expect(signUpMock).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: expect.objectContaining({ data: { display_name: "Test User" } }),
    });
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });
});
