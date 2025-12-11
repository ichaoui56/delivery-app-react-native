import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// SVG Icons
const MapIcon = ({ size = 40, color = '#0f8fd5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3ZM15 19L9 16.89V5L15 7.11V19Z"
            fill={color}
        />
    </Svg>
);

const LocationIcon = ({ size = 40, color = '#ff4757' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
            fill={color}
        />
    </Svg>
);

const EmailIcon = ({ size = 20, color = '#64748b' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"
            fill={color}
        />
    </Svg>
);

const LockIcon = ({ size = 20, color = '#64748b' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z"
            fill={color}
        />
    </Svg>
);

const EyeIcon = ({ size = 20, color = '#64748b' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"
            fill={color}
        />
    </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#64748b' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.64 13.83L19.56 16.75C21.07 15.49 22.26 13.86 22.99 12C21.26 7.61 16.99 4.5 11.99 4.5C10.59 4.5 9.25 4.75 8.01 5.2L10.17 7.36C10.74 7.13 11.35 7 12 7ZM2 4.27L4.28 6.55L4.74 7.01C3.08 8.3 1.78 10.02 1 12C2.73 16.39 7 19.5 12 19.5C13.55 19.5 15.03 19.2 16.38 18.66L16.8 19.08L19.73 22L21 20.73L3.27 3M7.53 9.8L9.08 11.35C9.03 11.56 9 11.78 9 12C9 13.66 10.34 15 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17C9.24 17 7 14.76 7 12C7 11.21 7.2 10.47 7.53 9.8ZM11.84 9.02L14.99 12.17L15.01 12.01C15.01 10.35 13.67 9.01 12.01 9.01L11.84 9.02Z"
            fill={color}
        />
    </Svg>
);

const GlobeIcon = ({ size = 24, color = '#0f8fd5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z"
            fill={color}
        />
    </Svg>
);

const ChartIcon = ({ size = 24, color = '#0f8fd5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"
            fill={color}
        />
    </Svg>
);

const BellIcon = ({ size = 24, color = '#0f8fd5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
            fill={color}
        />
    </Svg>
);

const RocketIcon = ({ size = 20, color = '#ffffff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M9.19 6.35C8.13 7.83 7.5 9.59 7.5 11.5C7.5 12.12 7.58 12.73 7.71 13.31L4.41 16.61C4.2 16.82 4.06 17.09 4.02 17.39L3.51 21.37C3.45 21.87 3.85 22.27 4.35 22.21L8.33 21.7C8.63 21.66 8.9 21.52 9.11 21.31L12.41 18.01C13 18.14 13.62 18.22 14.25 18.22C16.16 18.22 17.92 17.59 19.4 16.53L9.19 6.35ZM21.96 2.04C21.82 1.9 21.62 1.82 21.41 1.82H21.4C19.46 1.84 12.75 2.21 8.16 6.8L15.95 14.59C19.94 11.06 21.44 6.03 21.81 3.87C21.88 3.46 21.71 3.05 21.36 2.7L21.96 2.04ZM4.5 19.5C5.33 19.5 6 18.83 6 18C6 17.17 5.33 16.5 4.5 16.5C3.67 16.5 3 17.17 3 18C3 18.83 3.67 19.5 4.5 19.5Z"
            fill={color}
        />
    </Svg>
);

export default function SignInScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const emailInputRef = React.useRef<TextInput>(null);
    const passwordInputRef = React.useRef<TextInput>(null);

    const handleLogin = () => {
        Keyboard.dismiss();
        console.log('Login:', { email, password });
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}>
                {/* Animated Background */}
                <LinearGradient
                    colors={['#0f8fd5', '#0a6ba8', '#064d7a']}
                    style={styles.backgroundGradient}
                />

                {/* Map Grid Pattern Overlay */}
                <View style={styles.mapPattern} pointerEvents="none">
                    {[...Array(8)].map((_, i) => (
                        <View
                            key={`v-${i}`}
                            style={[
                                styles.gridLine,
                                styles.verticalLine,
                                { left: `${(i + 1) * 12.5}%` },
                            ]}
                        />
                    ))}
                    {[...Array(12)].map((_, i) => (
                        <View
                            key={`h-${i}`}
                            style={[
                                styles.gridLine,
                                styles.horizontalLine,
                                { top: `${(i + 1) * 8.33}%` },
                            ]}
                        />
                    ))}
                </View>

                {/* Pulsing Location Pin */}
                <View style={styles.pulsingPinContainer} pointerEvents="none">
                    <View style={styles.pulseRing} />
                    <LocationIcon size={40} color="#ffffff" />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        {/* Logo/Brand Area */}
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <MapIcon size={35} color="#0f8fd5" />
                            </View>
                            <Text style={styles.brandText}>TrackMe</Text>
                            <Text style={styles.welcomeText}>GPS Tracker</Text>
                            <Text style={styles.subtitleText}>Track. Monitor. Stay Safe.</Text>
                        </View>

                        {/* Login Card */}
                        <View style={styles.card}>
                            <View style={styles.cardContent}>
                                {/* Header */}
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Welcome Back</Text>
                                    <Text style={styles.cardSubtitle}>Sign in to track your devices</Text>
                                </View>

                                {/* Email Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <TouchableWithoutFeedback onPress={() => emailInputRef.current?.focus()}>
                                        <View
                                            style={[
                                                styles.inputContainer,
                                                focusedField === 'email' && styles.inputContainerFocused,
                                            ]}>
                                            <View style={styles.inputIconContainer}>
                                                <EmailIcon size={20} color={focusedField === 'email' ? '#0f8fd5' : '#64748b'} />
                                            </View>
                                            <TextInput
                                                ref={emailInputRef}
                                                style={styles.input}
                                                placeholder="your.email@example.com"
                                                placeholderTextColor="#94a3b8"
                                                value={email}
                                                onChangeText={setEmail}
                                                onFocus={() => setFocusedField('email')}
                                                onBlur={() => setFocusedField(null)}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoComplete="email"
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                            />
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>

                                {/* Password Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <TouchableWithoutFeedback onPress={() => passwordInputRef.current?.focus()}>
                                        <View
                                            style={[
                                                styles.inputContainer,
                                                focusedField === 'password' && styles.inputContainerFocused,
                                            ]}>
                                            <View style={styles.inputIconContainer}>
                                                <LockIcon size={20} color={focusedField === 'password' ? '#0f8fd5' : '#64748b'} />
                                            </View>
                                            <TextInput
                                                ref={passwordInputRef}
                                                style={styles.input}
                                                placeholder="Enter your password"
                                                placeholderTextColor="#94a3b8"
                                                value={password}
                                                onChangeText={setPassword}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                autoComplete="password"
                                                returnKeyType="done"
                                                onSubmitEditing={handleLogin}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeIcon}
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                {showPassword ? (
                                                    <EyeIcon size={20} color="#64748b" />
                                                ) : (
                                                    <EyeOffIcon size={20} color="#64748b" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>

                                {/* Login Button */}
                                <TouchableOpacity
                                    style={styles.loginButton}
                                    onPress={handleLogin}
                                    activeOpacity={0.8}>
                                    <LinearGradient
                                        colors={['#0f8fd5', '#0a6ba8']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.loginButtonGradient}>
                                        <View style={styles.loginButtonIcon}>
                                            <RocketIcon size={20} color="#ffffff" />
                                        </View>
                                        <Text style={styles.loginButtonText}>Start Tracking</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Features Preview */}
                                <View style={styles.featuresContainer}>
                                    <View style={styles.featureItem}>
                                        <GlobeIcon size={24} color="#0f8fd5" />
                                        <Text style={styles.featureText}>Real-time Location</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <ChartIcon size={24} color="#0f8fd5" />
                                        <Text style={styles.featureText}>Route History</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <BellIcon size={24} color="#0f8fd5" />
                                        <Text style={styles.featureText}>Instant Alerts</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Bottom Info */}
                        <View style={styles.bottomInfo}>
                            <Text style={styles.bottomInfoText}>
                                Secure tracking with end-to-end encryption 🔒
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f8fd5',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    mapPattern: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        opacity: 0.15,
    },
    gridLine: {
        position: 'absolute',
        backgroundColor: '#ffffff',
    },
    verticalLine: {
        width: 1,
        height: '100%',
    },
    horizontalLine: {
        height: 1,
        width: '100%',
    },
    pulsingPinContainer: {
        position: 'absolute',
        top: height * 0.15,
        right: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 40,
        justifyContent: 'center',
        minHeight: height,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    brandText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 3,
        letterSpacing: 1,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        marginBottom: 4,
    },
    subtitleText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '400',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 24,
    },
    cardHeader: {
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 52,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputContainerFocused: {
        backgroundColor: '#ffffff',
        borderColor: '#0f8fd5',
        shadowColor: '#0f8fd5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    inputIconContainer: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
        padding: 0,
        height: 52,
    },
    eyeIcon: {
        padding: 8,
        marginLeft: 4,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 4,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxInner: {
        width: 10,
        height: 10,
        borderRadius: 3,
        backgroundColor: '#0f8fd5',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    forgotPasswordText: {
        color: '#0f8fd5',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#0f8fd5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    loginButtonGradient: {
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonIcon: {
        marginRight: 10,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 22,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    featureItem: {
        alignItems: 'center',
        flex: 1,
    },
    featureText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
    },
    bottomInfo: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    bottomInfoText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
});