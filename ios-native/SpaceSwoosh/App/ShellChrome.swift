// ShellChrome.swift
// Changes: Slice E — shared paper header / ink buttons for Journey shell.

import SwiftUI

enum ShellChrome {
    static func header(_ title: String, back: @escaping () -> Void) -> some View {
        HStack {
            Button(action: back) {
                Text("BACK")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.ink)
            }
            Spacer()
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
        }
    }

    static func inkButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.paper)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(BrandColors.signal)
        }
    }

    static func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
        }
    }
}
