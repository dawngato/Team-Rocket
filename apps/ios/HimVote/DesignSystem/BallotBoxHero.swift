import SwiftUI

/// Decorative depth cue for public/authentication surfaces.
///
/// This view is intentionally not used for ballot choices, proof values, or
/// irreversible actions. It communicates product identity only; no security
/// state is inferred from its animation.
public struct BallotBoxHero: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dragOffset: CGSize = .zero

    public init() {}

    public var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 30)
                .fill(ColorTokens.brandPrimary.opacity(0.08))
                .frame(width: 178, height: 132)
                .blur(radius: 2)

            ballotBox
                .frame(width: 150, height: 104)
                .rotation3DEffect(
                    .degrees(xAngle),
                    axis: (x: 1, y: 0, z: 0),
                    perspective: 0.65
                )
                .rotation3DEffect(
                    .degrees(yAngle),
                    axis: (x: 0, y: 1, z: 0),
                    perspective: 0.65
                )
                .gesture(tiltGesture)
        }
        .frame(width: 190, height: 140)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Decorative three dimensional ballot box illustration")
        .accessibilityHint("Presentation only. It does not indicate ballot or verification status.")
    }

    private var xAngle: Double {
        guard !reduceMotion else { return 0 }
        return capped(-Double(dragOffset.height) / 8)
    }

    private var yAngle: Double {
        guard !reduceMotion else { return 0 }
        return capped(Double(dragOffset.width) / 8)
    }

    private func capped(_ value: Double) -> Double {
        min(max(value, -7), 7)
    }

    private var tiltGesture: some Gesture {
        let motionEnabled = !reduceMotion

        DragGesture(minimumDistance: 4)
            .onChanged { value in
                guard motionEnabled else { return }
                dragOffset = CGSize(
                    width: min(max(value.translation.width, -56), 56),
                    height: min(max(value.translation.height, -56), 56)
                )
            }
            .onEnded { _ in
                guard motionEnabled else { return }
                withAnimation(.easeOut(duration: 0.28)) {
                    dragOffset = .zero
                }
            }
    }

    private var ballotBox: some View {
        ZStack {
            // Side plane gives the object a readable silhouette at small sizes.
            RoundedRectangle(cornerRadius: 13)
                .fill(
                    LinearGradient(
                        colors: [ColorTokens.brandPrimary, ColorTokens.institutionalNavy],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 92, height: 78)
                .offset(x: 28, y: 10)

            // Front plane remains high contrast and stable for reduced motion.
            RoundedRectangle(cornerRadius: 13)
                .fill(
                    LinearGradient(
                        colors: [ColorTokens.brandAccent, ColorTokens.brandPrimary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 106, height: 82)
                .overlay {
                    RoundedRectangle(cornerRadius: 13)
                        .stroke(Color.white.opacity(0.42), lineWidth: 1)
                }
                .shadow(color: ColorTokens.brandPrimary.opacity(0.28), radius: 12, y: 8)

            // The slot is a visual metaphor only; it is not a tappable cast target.
            Capsule()
                .fill(ColorTokens.institutionalNavy.opacity(0.9))
                .frame(width: 56, height: 8)
                .overlay {
                    Capsule()
                        .stroke(Color.white.opacity(0.24), lineWidth: 1)
                }
                .offset(y: -20)

            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 31, weight: .semibold))
                .foregroundStyle(.white.opacity(0.92))
                .offset(y: 10)
        }
    }
}

#Preview {
    BallotBoxHero()
        .padding(24)
        .background(ColorTokens.backgroundPrimary)
}
