import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/customer_app_bar.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  File? _avatarFile;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final user = AuthService().currentUser;
    _nameController.text = user?.name ?? '';
    _phoneController.text = user?.phone ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked != null) {
      setState(() {
        _avatarFile = File(picked.path);
      });
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_avatarFile != null) {
        final formData = FormData.fromMap({
          'name': _nameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'avatar': await MultipartFile.fromFile(
            _avatarFile!.path,
            filename: 'avatar_${DateTime.now().millisecondsSinceEpoch}.jpg',
          ),
        });
        await AuthService().updateProfile(formData);
      } else {
        await AuthService().updateProfile({
          'name': _nameController.text.trim(),
          'phone': _phoneController.text.trim(),
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Edit Profile',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppTheme.errorColor, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Avatar Picker
              GestureDetector(
                onTap: _pickAvatar,
                child: Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primaryColor, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: _avatarFile != null
                          ? Image.file(_avatarFile!, fit: BoxFit.cover)
                          : AppNetworkImage(
                              url: user?.avatar,
                              fit: BoxFit.cover,
                              errorWidget: Container(
                                color: AppTheme.tintVioletBg,
                                child: Center(
                                  child: Text(
                                    user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(
                                      fontSize: 32,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryColor,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              AppTextField(
                controller: _nameController,
                label: 'Full Name',
                prefixIcon: const Icon(Icons.person_outline, size: 20),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please enter your name';
                  return null;
                },
              ),
              const SizedBox(height: 18),
              AppTextField(
                controller: _phoneController,
                label: 'Phone Number',
                hint: '+91 9876543210',
                keyboardType: TextInputType.phone,
                prefixIcon: const Icon(Icons.phone_outlined, size: 20),
              ),
              const SizedBox(height: 28),
              AppButton(
                text: 'Save Changes',
                isLoading: _isLoading,
                onPressed: _isLoading ? null : _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

